import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { dbGet, dbSet } from './lib/db';
import { migrateTasksAndProjects, weightedCompletion, toISODate, startOfWeek } from './lib/taskUtils';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TaskBoard from './pages/TaskBoard';
import FitnessDeck from './pages/FitnessDeck';
import Projects from './pages/Projects';
import TodayFocus from './pages/TodayFocus';

// ---------------------------------------------------------------------------
// STORAGE LAYER
// Artifacts can't use localStorage/sessionStorage, so everything goes through
// window.storage (async key/value store). We load all keys once on mount and
// write through on every change. Each write is fire-and-forget but errors are
// surfaced via a small toast so data loss is visible instead of silent.
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  tasks: 'summit_tasks',
  strengthLogs: 'summit_strength_logs',
  cardioLogs: 'summit_cardio_logs',
  workoutTemplates: 'summit_workout_templates',
  weeklyWorkoutPlan: 'summit_weekly_workout_plan',
  projects: 'summit_projects',
  dailySelections: 'summit_daily_selections',
  weeklyReviewLog: 'summit_weekly_review_log'
};


const DEFAULT_WORKOUT_TEMPLATES = [
  { id: 1, name: 'Lower Deck Alpha', exercises: [
    { name: 'Squat', type: 'gym' }, { name: 'Leg Press', type: 'gym' }, { name: 'Calf Raise', type: 'gym' }
  ]},
  { id: 2, name: 'Upper Deck Prime', exercises: [
    { name: 'Bench Press', type: 'gym' }, { name: 'Lat Pulldown', type: 'gym' },
    { name: 'Shoulder Press', type: 'gym' }, { name: 'Bicep Curl', type: 'gym' }
  ]}
];

// Each day maps to a list of workout names (the fitness sub-app supports
// multiple workouts per day); [] means rest. Legacy single-string values are
// normalized on read via lib/planUtils.
const DEFAULT_WEEKLY_WORKOUT_PLAN = {
  Monday: ['Lower Deck Alpha'], Tuesday: [], Wednesday: ['Upper Deck Prime'],
  Thursday: [], Friday: ['Lower Deck Alpha'], Saturday: [], Sunday: []
};

const REST_WEEK = {
  Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
};

export default function App() {
  // Global State Engine
  const [currentPage, setCurrentPage] = useState('Main Hub');
  const [tasks, setTasks] = useState([]);
  const [strengthLogs, setStrengthLogs] = useState([]);
  const [cardioLogs, setCardioLogs] = useState([]);
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [weeklyWorkoutPlan, setWeeklyWorkoutPlan] = useState(REST_WEEK);
  const [projects, setProjects] = useState([]);
  const [dailySelections, setDailySelections] = useState({});
  const [weeklyReviewLog, setWeeklyReviewLog] = useState([]);

  // Cross-page deep links (task -> project, project -> task) without a
  // router: a page sets `pendingNav` via `navigateTo`, the target page reads
  // its own scoped payload in a useEffect and clears it.
  const [pendingNav, setPendingNav] = useState(null); // { page, payload } | null
  const navigateTo = (page, payload = null) => {
    setPendingNav(payload ? { page, payload } : null);
    setCurrentPage(page);
  };
  const clearPendingNav = () => setPendingNav(null);

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

  // Calendar Utility Definitions
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const saveToStorage = (key, data) => {
    dbSet(key, data).catch(() => {
      showToast('Save failed — your change is visible but may not persist.', true);
    });
  };

  // -------------------------------------------------------------------------
  // Load all data from persistent storage on startup
  // -------------------------------------------------------------------------
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
        const [t, sl, cl, wt, wwp, rawProjects, ds, wrl] = await Promise.all([
          loadData(STORAGE_KEYS.tasks, []),
          loadData(STORAGE_KEYS.strengthLogs, []),
          loadData(STORAGE_KEYS.cardioLogs, []),
          loadData(STORAGE_KEYS.workoutTemplates, DEFAULT_WORKOUT_TEMPLATES),
          loadData(STORAGE_KEYS.weeklyWorkoutPlan, DEFAULT_WEEKLY_WORKOUT_PLAN),
          loadData(STORAGE_KEYS.projects, []),
          loadData(STORAGE_KEYS.dailySelections, {}),
          loadData(STORAGE_KEYS.weeklyReviewLog, []),
        ]);

        // Backfills `status`/`weight`/`tags`/`properties`/`completedAt` on
        // tasks, and migrates any legacy `properties.project` string into a
        // real `projects` entry. The project-creation half must be
        // force-written immediately (see taskUtils) or it would re-mint
        // duplicate projects on every reload before the first save.
        const { tasks: migratedTasks, projects: migratedProjects, forceWrite } =
          migrateTasksAndProjects(t, rawProjects);

        setTasks(migratedTasks);
        setStrengthLogs(sl);
        setCardioLogs(cl);
        setWorkoutTemplates(wt);
        setWeeklyWorkoutPlan(wwp);
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
        return {
          ...t,
          checklist: t.checklist.map(item =>
            item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
          )
        };
      }
      return t;
    });
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  const handleCompleteTask = (taskId) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          isCompleted: true,
          status: 'done',
          completedAt: new Date().toISOString(),
          checklist: t.checklist.map(item => ({ ...item, isCompleted: true }))
        };
      }
      return t;
    });
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  // Drives the kanban board — dragging a card to a column, or setting status
  // from the task detail modal. Keeps `isCompleted` in sync since the rest of
  // the app's stats (velocity, overdue, dashboard) key off of it.
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

  // Full-task edit (name/dates/notes/checklist/tags/properties) from the
  // task detail modal's edit form. `updates` is a plain object merged onto
  // the existing task, so callers only need to send the fields that changed.
  const handleUpdateTask = (taskId, updates) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  // Historical completion rate across all checklist items ever created,
  // weighted by each item's `weight` (default 1) rather than a flat count.
  // Returns null (not 0 or 1) when there's no data yet, so the UI can show
  // "no data" instead of a misleading 100%.
  const getHistoricalVelocity = () => {
    const allItems = tasks.flatMap(t => t.checklist);
    return weightedCompletion(allItems);
  };

  // Estimated workload "weight" landing on a given date, spread across each
  // task's remaining days until its target date.
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

  // Tasks whose hard deadline has passed but aren't marked done — surfaced
  // separately since `dueDate` was previously collected but never used.
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

  // Deleting a project never deletes its tasks — it only orphans the link,
  // which is why the tasks array is left untouched here (orphaned tasks are
  // surfaced separately via the Projects page's orphaned-tasks banner).
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
    const updatedForToday = current.includes(taskId)
      ? current.filter(id => id !== taskId)
      : [...current, taskId];
    const updated = { ...dailySelections, [todayISO]: updatedForToday };
    setDailySelections(updated);
    saveToStorage(STORAGE_KEYS.dailySelections, updated);
  };

  // Appends a completed review to the log only — task data is never mutated
  // by the review ritual, it's purely observational.
  const handleCompleteWeeklyReview = (notes) => {
    const entry = {
      weekStartDate: toISODate(startOfWeek(new Date())),
      completedAt: new Date().toISOString(),
      notes
    };
    const updated = [...weeklyReviewLog, entry];
    setWeeklyReviewLog(updated);
    saveToStorage(STORAGE_KEYS.weeklyReviewLog, updated);
  };

  // ---------------------------------------------------------------------------
  // FITNESS ENGINE ACTIONS
  // ---------------------------------------------------------------------------
  const [workoutTemplateForm, setWorkoutTemplateForm] = useState({ name: '', exercises: [], draftName: '', draftType: 'gym' });
  const [cardioForm, setCardioForm] = useState({ activity: 'Running', duration: 30, distance: 5 });
  const [strengthLogInputs, setStrengthLogInputs] = useState({});
  const [cardioLogInputs, setCardioLogInputs] = useState({});
  const [justLogged, setJustLogged] = useState({});
  const [justLoggedCardio, setJustLoggedCardio] = useState({});

  const handleAddExerciseToDraft = () => {
    if (!workoutTemplateForm.draftName.trim()) return;
    setWorkoutTemplateForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, { name: prev.draftName.trim(), type: prev.draftType }],
      draftName: '',
      draftType: 'gym'
    }));
  };

  const handleRemoveDraftExercise = (idx) => {
    setWorkoutTemplateForm(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== idx)
    }));
  };

  const handleCreateWorkoutTemplate = () => {
    if (!workoutTemplateForm.name.trim() || workoutTemplateForm.exercises.length === 0) return;
    const newTemplate = {
      id: Date.now(),
      name: workoutTemplateForm.name.trim(),
      exercises: workoutTemplateForm.exercises
    };
    const updated = [...workoutTemplates, newTemplate];
    setWorkoutTemplates(updated);
    saveToStorage(STORAGE_KEYS.workoutTemplates, updated);
    setWorkoutTemplateForm({ name: '', exercises: [], draftName: '', draftType: 'gym' });
  };

  const handleDeleteTemplate = (id) => {
    const updated = workoutTemplates.filter(t => t.id !== id);
    setWorkoutTemplates(updated);
    saveToStorage(STORAGE_KEYS.workoutTemplates, updated);
  };

  const handleUpdateWeeklyWorkout = (day, templateName) => {
    // Keeps the list-per-day shape: this single-select editor assigns one
    // workout; the fitness sub-app can stack multiple on a day.
    const updated = { ...weeklyWorkoutPlan, [day]: templateName === 'Rest Day' ? [] : [templateName] };
    setWeeklyWorkoutPlan(updated);
    saveToStorage(STORAGE_KEYS.weeklyWorkoutPlan, updated);
  };

  const handleApplyWeekPreset = (preset) => {
    setWeeklyWorkoutPlan(preset);
    saveToStorage(STORAGE_KEYS.weeklyWorkoutPlan, preset);
  };

  const handleLogManualCardio = () => {
    const duration = Number(cardioForm.duration);
    const distance = Number(cardioForm.distance);
    if (!duration || duration <= 0) return;

    const newLog = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      activity: cardioForm.activity,
      duration,
      distance
    };
    const updated = [...cardioLogs, newLog];
    setCardioLogs(updated);
    saveToStorage(STORAGE_KEYS.cardioLogs, updated);
    showToast('Cardio session logged.');
  };

  // Strength logging is keyed by `${templateName}::${exercise}` rather than
  // just the exercise name, so two templates sharing an exercise (e.g. both
  // having "Squat") don't share the same input state or "locked" flash.
  const strengthKey = (templateName, exercise) => `${templateName}::${exercise}`;

  const handleLogStrengthFromHub = (templateName, exercise) => {
    const key = strengthKey(templateName, exercise);
    const inputs = strengthLogInputs[key] || { weight: 40, sets: 3, reps: 8 };
    const newLog = {
      id: Date.now() + Math.random(),
      date: new Date().toISOString().split('T')[0],
      exercise,
      weight: Number(inputs.weight),
      sets: Number(inputs.sets),
      reps: Number(inputs.reps)
    };
    const updated = [...strengthLogs, newLog];
    setStrengthLogs(updated);
    saveToStorage(STORAGE_KEYS.strengthLogs, updated);

    // Brief "locked" confirmation driven by state, not direct DOM mutation
    setJustLogged(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setJustLogged(prev => ({ ...prev, [key]: false }));
    }, 1500);
  };

  const handleLogCardioFromHub = (templateName, exerciseName) => {
    const key = strengthKey(templateName, exerciseName);
    const mins = Number(cardioLogInputs[key]?.minutes ?? 30);
    if (!mins || mins <= 0) return;
    const newLog = {
      id: Date.now() + Math.random(),
      date: new Date().toISOString().split('T')[0],
      activity: exerciseName,
      duration: mins,
      distance: 0
    };
    const updated = [...cardioLogs, newLog];
    setCardioLogs(updated);
    saveToStorage(STORAGE_KEYS.cardioLogs, updated);
    setJustLoggedCardio(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setJustLoggedCardio(prev => ({ ...prev, [key]: false })), 1500);
    showToast(`${exerciseName} session logged.`);
  };

  const handleDeleteStrengthLog = (id) => {
    const updated = strengthLogs.filter(log => log.id !== id);
    setStrengthLogs(updated);
    saveToStorage(STORAGE_KEYS.strengthLogs, updated);
  };

  const handleDeleteCardioLog = (id) => {
    const updated = cardioLogs.filter(log => log.id !== id);
    setCardioLogs(updated);
    saveToStorage(STORAGE_KEYS.cardioLogs, updated);
  };

  const getTotalKineticVolume = () => {
    return strengthLogs.reduce((acc, log) => acc + log.weight * log.sets * log.reps, 0);
  };

  const getTotalCardioMinutes = () => {
    return cardioLogs.reduce((acc, log) => acc + log.duration, 0);
  };

  // Swiss Date Formatting Utility (DD.MM.YYYY)
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
            <div className="text-2xl font-semibold text-gray-900">Summit</div>
            <div className="text-xs text-gray-400 mt-1">Command Center</div>
          </div>
          <div className={`w-full flex flex-col gap-3 ${passwordError ? 'animate-bounce' : ''}`}>
            <input
              type="password"
              placeholder="Password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              autoFocus
              className={`w-full bg-white border ${passwordError ? 'border-red-400' : 'border-gray-200'} rounded-lg px-4 py-3 text-gray-900 text-sm outline-none focus:border-blue-500 transition-colors`}
            />
            <button
              onClick={handleUnlock}
              className="w-full bg-blue-600 text-white font-medium text-sm py-3 rounded-lg hover:bg-blue-700 transition-colors"
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
  // LOADING / ERROR STATES
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-blue-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-xs text-gray-400">Loading…</span>
        </div>
      </div>
    );
  }

  const velocity = getHistoricalVelocity();
  const overdueTasks = getOverdueTasks();

  return (
    <div className="min-h-screen bg-[#f7f7f5] dark:bg-[#191919] text-[#37352f] dark:text-[#e6e6e6] font-sans antialiased flex">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <div className="flex-1 min-w-0">
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border text-sm shadow-lg flex items-center gap-2 ${
              toast.isError
                ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400'
                : 'bg-white border-gray-200 text-gray-700 dark:bg-[#252525] dark:border-white/10 dark:text-gray-200'
            }`}
          >
            {toast.isError && <AlertTriangle className="w-4 h-4" />}
            {toast.message}
          </div>
        )}

        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">

          {loadError && (
            <div className="mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            {currentPage === 'Main Hub' && 'Home'}
            {currentPage === 'Task Dashboard' && 'Tasks'}
            {currentPage === 'Today Focus' && 'Today'}
            {currentPage === 'Projects' && 'Projects'}
            {currentPage === 'Fitness Dashboard' && 'Fitness'}
          </h1>

          {currentPage === 'Main Hub' && (
            <Dashboard
              tasks={tasks}
              overdueTasks={overdueTasks}
              weeklyWorkoutPlan={weeklyWorkoutPlan}
              workoutTemplates={workoutTemplates}
              todayDayName={todayDayName}
              strengthLogs={strengthLogs}
              cardioLogs={cardioLogs}
              setCurrentPage={setCurrentPage}
              getDistributedMilestonesCount={getDistributedMilestonesCount}
              formatToSwissDate={formatToSwissDate}
              handleToggleSubtask={handleToggleSubtask}
              handleCompleteTask={handleCompleteTask}
              strengthLogInputs={strengthLogInputs}
              setStrengthLogInputs={setStrengthLogInputs}
              cardioLogInputs={cardioLogInputs}
              setCardioLogInputs={setCardioLogInputs}
              justLogged={justLogged}
              justLoggedCardio={justLoggedCardio}
              strengthKey={strengthKey}
              handleLogStrengthFromHub={handleLogStrengthFromHub}
              handleLogCardioFromHub={handleLogCardioFromHub}
            />
          )}

          {currentPage === 'Task Dashboard' && (
            <TaskBoard
              tasks={tasks}
              projects={projects}
              overdueTasks={overdueTasks}
              velocity={velocity}
              getDistributedMilestonesCount={getDistributedMilestonesCount}
              formatToSwissDate={formatToSwissDate}
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              handleCreateTask={handleCreateTask}
              handleToggleSubtask={handleToggleSubtask}
              handleUpdateTaskStatus={handleUpdateTaskStatus}
              handleUpdateTask={handleUpdateTask}
              handleDeleteTask={handleDeleteTask}
              navigateTo={navigateTo}
              pendingNav={pendingNav?.page === 'Task Dashboard' ? pendingNav.payload : null}
              clearPendingNav={clearPendingNav}
            />
          )}

          {currentPage === 'Today Focus' && (
            <TodayFocus
              tasks={tasks}
              projects={projects}
              overdueTasks={overdueTasks}
              dailySelections={dailySelections}
              weeklyReviewLog={weeklyReviewLog}
              formatToSwissDate={formatToSwissDate}
              handleToggleSubtask={handleToggleSubtask}
              handleCompleteTask={handleCompleteTask}
              handleUpdateTaskStatus={handleUpdateTaskStatus}
              handleUpdateTask={handleUpdateTask}
              handleDeleteTask={handleDeleteTask}
              handleToggleDailySelection={handleToggleDailySelection}
              handleCompleteWeeklyReview={handleCompleteWeeklyReview}
              navigateTo={navigateTo}
              pendingNav={pendingNav?.page === 'Today Focus' ? pendingNav.payload : null}
              clearPendingNav={clearPendingNav}
            />
          )}

          {currentPage === 'Projects' && (
            <Projects
              tasks={tasks}
              projects={projects}
              overdueTasks={overdueTasks}
              formatToSwissDate={formatToSwissDate}
              handleCreateProject={handleCreateProject}
              handleRenameProject={handleRenameProject}
              handleUpdateProjectNotes={handleUpdateProjectNotes}
              handleDeleteProject={handleDeleteProject}
              handleToggleSubtask={handleToggleSubtask}
              handleUpdateTaskStatus={handleUpdateTaskStatus}
              handleUpdateTask={handleUpdateTask}
              handleDeleteTask={handleDeleteTask}
              navigateTo={navigateTo}
              pendingNav={pendingNav?.page === 'Projects' ? pendingNav.payload : null}
              clearPendingNav={clearPendingNav}
            />
          )}

          {currentPage === 'Fitness Dashboard' && (
            <FitnessDeck
              strengthLogs={strengthLogs}
              cardioLogs={cardioLogs}
              workoutTemplates={workoutTemplates}
              weeklyWorkoutPlan={weeklyWorkoutPlan}
              daysOfWeek={daysOfWeek}
              workoutTemplateForm={workoutTemplateForm}
              setWorkoutTemplateForm={setWorkoutTemplateForm}
              cardioForm={cardioForm}
              setCardioForm={setCardioForm}
              getTotalKineticVolume={getTotalKineticVolume}
              getTotalCardioMinutes={getTotalCardioMinutes}
              handleAddExerciseToDraft={handleAddExerciseToDraft}
              handleRemoveDraftExercise={handleRemoveDraftExercise}
              handleCreateWorkoutTemplate={handleCreateWorkoutTemplate}
              handleDeleteTemplate={handleDeleteTemplate}
              handleUpdateWeeklyWorkout={handleUpdateWeeklyWorkout}
              handleApplyWeekPreset={handleApplyWeekPreset}
              handleLogManualCardio={handleLogManualCardio}
              handleDeleteStrengthLog={handleDeleteStrengthLog}
              handleDeleteCardioLog={handleDeleteCardioLog}
              REST_WEEK={REST_WEEK}
            />
          )}

        </div>
      </div>
    </div>
  );
}
