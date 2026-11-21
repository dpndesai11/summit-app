import { useState, useEffect } from 'react';
import { dbGet, dbSet } from './db.js';
import {
  SOMEDAY_TAG, checkInProgressLimit, inProgressLimitMessage, isSomeday, migrateTasksAndProjects, weightedCompletion, toISODate,
} from './taskUtils.js';

// The tasks / projects / today-focus engine, shared by the Planner (the board and
// projects pages) and the Summit home screen (the calendar shows tasks too).
// Owns the load-on-mount, every handler and a small toast. Both apps run it
// against the same summit_* keys, and never at the same time (they are separate
// pages), so there is no state to keep in sync between them.
//
// A task moved to Done is archived: `status === 'done'` is the whole rule. The
// board hides done tasks; they stay on their project and in the Planner's Archive,
// and moving one back out of Done (restore) brings it onto the board again.

// Focus rules: at most one In Progress task per project and two in total (a move that
// would break that is refused with a gentle toast); a task with the `someday` tag is an
// idea parked for later, off the board; every edit stamps `updatedAt` so "last touched"
// is known.

const STORAGE_KEYS = {
  tasks: 'summit_tasks',
  projects: 'summit_projects',
  dailySelections: 'summit_daily_selections',
};

export default function useTaskEngine() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dailySelections, setDailySelections] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, isError = false, ms = 3000) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), ms);
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
        const [t, rawProjects, ds] = await Promise.all([
          loadData(STORAGE_KEYS.tasks, []),
          loadData(STORAGE_KEYS.projects, []),
          loadData(STORAGE_KEYS.dailySelections, {}),
        ]);

        const { tasks: migratedTasks, projects: migratedProjects, forceWrite } =
          migrateTasksAndProjects(t, rawProjects);

        setTasks(migratedTasks);
        setProjects(migratedProjects);
        setDailySelections(ds);

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
        return { ...t, updatedAt: new Date().toISOString(), checklist: t.checklist.map(item => item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item) };
      }
      return t;
    });
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  // Returns false (and shows a gentle toast) when the move would put a second card of a
  // project, or a third card overall, in progress.
  const handleUpdateTaskStatus = (taskId, newStatus) => {
    const current = tasks.find(t => t.id === taskId);
    if (current && current.status !== newStatus && newStatus === 'in_progress') {
      const check = checkInProgressLimit(tasks, taskId);
      if (!check.ok) {
        showToast(inProgressLimitMessage(check, projects), false, 6000);
        return false;
      }
    }
    const now = new Date().toISOString();
    const updated = tasks.map(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        status: newStatus,
        isCompleted: newStatus === 'done',
        completedAt: newStatus === 'done' ? now : null,
        updatedAt: now,
      };
    });
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
    return true;
  };

  const handleDeleteTask = (taskId) => {
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  const handleUpdateTask = (taskId, updates) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  // Someday: an idea parked as a todo task with the `someday` tag (no dates, no project).
  const handleAddSomeday = (name) => {
    if (!name.trim()) return;
    const idea = {
      id: Date.now(), name: name.trim(), dueDate: '', targetDate: '', notes: '', isCompleted: false,
      status: 'todo', completedAt: null, checklist: [], tags: [SOMEDAY_TAG], properties: {},
    };
    const updated = [...tasks, idea];
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  // Move an idea onto the board: it keeps being a todo task, just without the tag.
  const handlePromoteSomeday = (taskId) => {
    const updated = tasks.map(t => (t.id === taskId
      ? { ...t, tags: (t.tags || []).filter(x => String(x).toLowerCase() !== SOMEDAY_TAG), updatedAt: new Date().toISOString() }
      : t));
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
      if (t.isCompleted || isSomeday(t) || !t.dueDate) return false;
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
  // TODAY / FOCUS ACTIONS
  // ---------------------------------------------------------------------------
  const handleToggleDailySelection = (taskId) => {
    const todayISO = toISODate(new Date());
    const current = dailySelections[todayISO] || [];
    const updatedForToday = current.includes(taskId) ? current.filter(id => id !== taskId) : [...current, taskId];
    const updated = { ...dailySelections, [todayISO]: updatedForToday };
    setDailySelections(updated);
    saveToStorage(STORAGE_KEYS.dailySelections, updated);
  };

  const formatToSwissDate = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dateStr;
  };


  const overdueTasks = getOverdueTasks();
  const velocity = getHistoricalVelocity();

  return {
    tasks, projects, overdueTasks, velocity, dailySelections, isLoading, loadError, toast, showToast,
    getDistributedMilestonesCount, formatToSwissDate, taskForm, setTaskForm,
    handleCreateTask, handleToggleSubtask, handleUpdateTaskStatus, handleUpdateTask,
    handleDeleteTask, handleCreateProject, handleRenameProject, handleUpdateProjectNotes,
    handleDeleteProject, handleToggleDailySelection, handleAddSomeday, handlePromoteSomeday,
  };
}
