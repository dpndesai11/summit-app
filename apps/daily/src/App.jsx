import { useState, useEffect } from 'react';
import { dbGet, dbSet } from './lib/db';
import { migrateTasksAndProjects, weightedCompletion, toISODate, startOfWeek } from './lib/taskUtils';
import DailyApp from './DailyApp';

// ---------------------------------------------------------------------------
// Summit Daily — top-level state owner (2026-08-30 merge). This app used to
// be Tasks (at the site root, password-gated) and Daily (a separate phone
// app for Workouts/Meals) side by side; they're now one app under the Daily
// identity, deployed at the root. This file owns exactly what Tasks' App.jsx
// used to own for tasks/projects/today-focus/weekly-review — the auth gate,
// the load-on-mount, and every handler — since those are shared across
// Home/Tasks/Projects. It deliberately does NOT own workout/meal state:
// WorkoutsSection/MealsSection/Home keep loading those domains themselves,
// same self-contained pattern as before the merge.
//
// The old Tasks app also carried its own redundant copy of fitness data
// (workoutTemplates, weeklyWorkoutPlan, strengthLogs, cardioLogs) purely to
// feed its standalone "Fitness Dashboard" page and a "Training today" widget
// on its old Main Hub. Both are gone — Workouts already owns this data
// properly (sessions, PRs, streaks) — so none of that carries over here.
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  tasks: 'summit_tasks',
  projects: 'summit_projects',
  dailySelections: 'summit_daily_selections',
  weeklyReviewLog: 'summit_weekly_review_log',
};

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dailySelections, setDailySelections] = useState({});
  const [weeklyReviewLog, setWeeklyReviewLog] = useState([]);

  // Cross-page deep links (task -> project, project -> task) without a
  // router: a page sets `pendingNav` via `navigateTo`, the target page reads
  // its own scoped payload and clears it.
  const [pendingNav, setPendingNav] = useState(null); // { page, payload } | null
  const navigateTo = (page, payload = null) => {
    setPendingNav(payload ? { page, payload } : null);
    setSection(page);
  };
  const clearPendingNav = () => setPendingNav(null);

  const [section, setSection] = useState('Home');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);

  const [isAuthed, setIsAuthed] = useState(() => sessionStorage.getItem('summit_authed') === '1');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('summit_dark_mode') === 'true');
  useEffect(() => {
    localStorage.setItem('summit_dark_mode', darkMode);
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const saveToStorage = (key, data) => {
    dbSet(key, data).catch(() => {
      showToast('Save failed — your change is visible but may not persist.', true);
    });
  };

  useEffect(() => {
    const load = async () => {
      const loadData = async (key, fallback) => {
        try {
          const val = await dbGet(key);
          return val ?? fallback;
        } catch {
          return fallback;
        }
      };
      try {
        const [t, rawProjects, ds, wrl] = await Promise.all([
          loadData(STORAGE_KEYS.tasks, []),
          loadData(STORAGE_KEYS.projects, []),
          loadData(STORAGE_KEYS.dailySelections, {}),
          loadData(STORAGE_KEYS.weeklyReviewLog, []),
        ]);

        const { tasks: migratedTasks, projects: migratedProjects, forceWrite } =
          migrateTasksAndProjects(t, rawProjects);

        setTasks(migratedTasks);
        setProjects(migratedProjects);
        setDailySelections(ds);
        setWeeklyReviewLog(wrl);

        if (forceWrite) {
          saveToStorage(STORAGE_KEYS.tasks, migratedTasks);
          saveToStorage(STORAGE_KEYS.projects, migratedProjects);
        }
      } catch {
        setLoadError('Could not load saved data. Starting with a clean slate — anything you add will still try to save.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ---------------------------------------------------------------------------
  // TASK ENGINE ACTIONS
  // ---------------------------------------------------------------------------
  const emptyTaskForm = { name: '', dueDate: '', targetDate: '', notes: '', checklist: [], tags: [], properties: {} };
  const [taskForm, setTaskForm] = useState(emptyTaskForm);

  const handleCreateTask = () => {
    if (!taskForm.name.trim() || !taskForm.targetDate) return;
    const newTask = {
      id: Date.now(),
      name: taskForm.name.trim(),
      dueDate: taskForm.dueDate,
      targetDate: taskForm.targetDate,
      notes: taskForm.notes,
      isCompleted: false,
      status: 'todo',
      completedAt: null,
      checklist: taskForm.checklist,
      tags: taskForm.tags,
      properties: taskForm.properties
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
    setTaskForm(emptyTaskForm);
  };

  const handleToggleSubtask = (taskId, itemId) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, checklist: t.checklist.map(item => item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item) };
      }
      return t;
    });
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  const handleUpdateTaskStatus = (taskId, newStatus) => {
    const updated = tasks.map(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        status: newStatus,
        isCompleted: newStatus === 'done',
        completedAt: newStatus === 'done' ? new Date().toISOString() : null
      };
    });
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  const handleDeleteTask = (taskId) => {
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  const handleUpdateTask = (taskId, updates) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  const getHistoricalVelocity = () => {
    const allItems = tasks.flatMap(t => t.checklist);
    return weightedCompletion(allItems);
  };

  const getDistributedMilestonesCount = (targetDateStr) => {
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(targetDateStr);
    checkDate.setHours(0, 0, 0, 0);

    tasks.forEach(t => {
      if (t.isCompleted) return;
      const target = new Date(t.targetDate);
      target.setHours(0, 0, 0, 0);
      if (today <= checkDate && checkDate <= target) {
        const daysRemaining = Math.max(1, Math.ceil((target - today) / (1000 * 60 * 60 * 24)) + 1);
        const incompleteChecklist = t.checklist.filter(item => !item.isCompleted).length;
        const remainingMilestones = incompleteChecklist === 0 ? 1 : incompleteChecklist;
        count += remainingMilestones / daysRemaining;
      }
    });
    return Math.round(count * 10) / 10;
  };

  const getOverdueTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter(t => {
      if (t.isCompleted || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    });
  };

  // ---------------------------------------------------------------------------
  // PROJECT ENGINE ACTIONS
  // ---------------------------------------------------------------------------
  const handleCreateProject = (name, notes = '') => {
    if (!name.trim()) return null;
    const newProject = { id: Date.now(), name: name.trim(), notes, createdAt: new Date().toISOString() };
    const updated = [...projects, newProject];
    setProjects(updated);
    saveToStorage(STORAGE_KEYS.projects, updated);
    return newProject.id;
  };

  const handleRenameProject = (projectId, name) => {
    if (!name.trim()) return;
    const updated = projects.map(p => p.id === projectId ? { ...p, name: name.trim() } : p);
    setProjects(updated);
    saveToStorage(STORAGE_KEYS.projects, updated);
  };

  const handleUpdateProjectNotes = (projectId, notes) => {
    const updated = projects.map(p => p.id === projectId ? { ...p, notes } : p);
    setProjects(updated);
    saveToStorage(STORAGE_KEYS.projects, updated);
  };

  const handleDeleteProject = (projectId) => {
    const updated = projects.filter(p => p.id !== projectId);
    setProjects(updated);
    saveToStorage(STORAGE_KEYS.projects, updated);
  };

  // ---------------------------------------------------------------------------
  // TODAY / FOCUS + WEEKLY REVIEW ACTIONS
  // ---------------------------------------------------------------------------
  const handleToggleDailySelection = (taskId) => {
    const todayISO = toISODate(new Date());
    const current = dailySelections[todayISO] || [];
    const updatedForToday = current.includes(taskId) ? current.filter(id => id !== taskId) : [...current, taskId];
    const updated = { ...dailySelections, [todayISO]: updatedForToday };
    setDailySelections(updated);
    saveToStorage(STORAGE_KEYS.dailySelections, updated);
  };

  const handleCompleteWeeklyReview = (notes) => {
    const entry = { weekStartDate: toISODate(startOfWeek(new Date())), completedAt: new Date().toISOString(), notes };
    const updated = [...weeklyReviewLog, entry];
    setWeeklyReviewLog(updated);
    saveToStorage(STORAGE_KEYS.weeklyReviewLog, updated);
  };

  const formatToSwissDate = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dateStr;
  };

  // ---------------------------------------------------------------------------
  // AUTH GATE
  // ---------------------------------------------------------------------------
  if (!isAuthed) {
    const handleUnlock = () => {
      if (passwordInput === import.meta.env.VITE_APP_PASSWORD) {
        sessionStorage.setItem('summit_authed', '1');
        setIsAuthed(true);
      } else {
        setPasswordError(true);
        setPasswordInput('');
        setTimeout(() => setPasswordError(false), 1500);
      }
    };
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 w-72">
          <div className="text-center">
            <div className="text-2xl font-semibold text-black">Summit</div>
            <div className="text-xs text-black mt-1">Daily</div>
          </div>
          <div className={`w-full flex flex-col gap-3 ${passwordError ? 'animate-bounce' : ''}`}>
            <input
              type="password"
              placeholder="Password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              autoFocus
              className={`w-full bg-white border ${passwordError ? 'border-red-400' : 'border-gray-200'} rounded-lg px-4 py-3 text-black text-sm outline-none focus:border-violet-500 transition-colors`}
            />
            <button
              onClick={handleUnlock}
              className="w-full bg-violet-600 text-white font-medium text-sm py-3 rounded-lg hover:bg-violet-700 transition-colors"
            >
              Unlock
            </button>
            {passwordError && <p className="text-red-500 text-xs text-center">Incorrect password</p>}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex">
        <div className="hidden md:block w-56 shrink-0 h-screen border-r border-black/8 px-3 py-4 space-y-1">
          <div className="skeleton h-6 w-24 mb-4" />
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-8 w-full" />
        </div>
        <div className="flex-1 max-w-5xl mx-auto px-4 md:px-6 lg:px-10 py-8 space-y-3">
          <div className="skeleton h-7 w-40" />
          <div className="skeleton h-32 w-full" />
          <div className="flex gap-3">
            <div className="skeleton h-40 flex-1" />
            <div className="skeleton h-40 flex-1" />
            <div className="skeleton h-40 flex-1" />
          </div>
        </div>
      </div>
    );
  }

  const overdueTasks = getOverdueTasks();
  const velocity = getHistoricalVelocity();

  return (
    <DailyApp
      section={section}
      setSection={setSection}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      toast={toast}
      loadError={loadError}
      taskProps={{
        tasks, projects, overdueTasks, velocity, dailySelections, weeklyReviewLog,
        getDistributedMilestonesCount, formatToSwissDate, taskForm, setTaskForm,
        handleCreateTask, handleToggleSubtask, handleUpdateTaskStatus, handleUpdateTask,
        handleDeleteTask, handleCreateProject, handleRenameProject, handleUpdateProjectNotes,
        handleDeleteProject, handleToggleDailySelection, handleCompleteWeeklyReview,
        navigateTo, pendingNav, clearPendingNav,
      }}
    />
  );
}
