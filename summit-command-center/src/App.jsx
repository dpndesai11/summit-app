import React, { useState, useEffect } from 'react';
import {
  Activity,
  BookOpen,
  CheckSquare,
  Calendar,
  Plus,
  Trash2,
  Utensils,
  ShoppingBag,
  Dumbbell,
  Loader2,
  AlertTriangle,
  Sun,
  Moon
} from 'lucide-react';
import { dbGet, dbSet } from './lib/db';

// ---------------------------------------------------------------------------
// STORAGE LAYER
// Artifacts can't use localStorage/sessionStorage, so everything goes through
// window.storage (async key/value store). We load all keys once on mount and
// write through on every change. Each write is fire-and-forget but errors are
// surfaced via a small toast so data loss is visible instead of silent.
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  tasks: 'summit_tasks',
  recipes: 'summit_recipes',
  mealPlan: 'summit_meal_plan',
  strengthLogs: 'summit_strength_logs',
  cardioLogs: 'summit_cardio_logs',
  workoutTemplates: 'summit_workout_templates',
  weeklyWorkoutPlan: 'summit_weekly_workout_plan'
};

const DEFAULT_RECIPES = [
  {
    id: 1,
    name: 'Protein Oats Complex',
    category: 'Breakfast',
    ingredients: ['Oats (50g)', 'Whey Protein (30g)', 'Blueberries (50g)', 'Almond Milk (150ml)'],
    instructions: 'Mix oats and almond milk. Microwave for 90s. Stir in protein powder, top with berries.'
  },
  {
    id: 2,
    name: 'Lean Chicken Rice Matrix',
    category: 'Meal',
    ingredients: ['Chicken Breast (200g)', 'Basmati Rice (75g)', 'Broccoli Florets (100g)', 'Olive Oil (10g)'],
    instructions: 'Grill chicken with spices. Boil rice. Steam broccoli. Combine and drizzle with oil.'
  }
];

const DEFAULT_MEAL_PLAN = {
  'Monday_Breakfast': 'Protein Oats Complex',
  'Monday_Meal 1': 'Lean Chicken Rice Matrix',
  'Wednesday_Meal 1': 'Lean Chicken Rice Matrix'
};

const DEFAULT_WORKOUT_TEMPLATES = [
  { id: 1, name: 'Lower Deck Alpha', exercises: ['Squat', 'Leg Press', 'Calf Raise'] },
  { id: 2, name: 'Upper Deck Prime', exercises: ['Bench Press', 'Lat Pulldown', 'Shoulder Press', 'Bicep Curl'] }
];

const DEFAULT_WEEKLY_WORKOUT_PLAN = {
  Monday: 'Lower Deck Alpha', Tuesday: 'Rest Day', Wednesday: 'Upper Deck Prime',
  Thursday: 'Rest Day', Friday: 'Lower Deck Alpha', Saturday: 'Rest Day', Sunday: 'Rest Day'
};

const REST_WEEK = {
  Monday: 'Rest Day', Tuesday: 'Rest Day', Wednesday: 'Rest Day',
  Thursday: 'Rest Day', Friday: 'Rest Day', Saturday: 'Rest Day', Sunday: 'Rest Day'
};

const RUN_WEEK = {
  Monday: 'Run Day', Tuesday: 'Run Day', Wednesday: 'Run Day',
  Thursday: 'Run Day', Friday: 'Run Day', Saturday: 'Run Day', Sunday: 'Run Day'
};

export default function App() {
  // Global State Engine
  const [currentPage, setCurrentPage] = useState('Main Hub');
  const [tasks, setTasks] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState({});
  const [strengthLogs, setStrengthLogs] = useState([]);
  const [cardioLogs, setCardioLogs] = useState([]);
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [weeklyWorkoutPlan, setWeeklyWorkoutPlan] = useState(REST_WEEK);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);

  const [isAuthed, setIsAuthed] = useState(() => sessionStorage.getItem('summit_authed') === '1');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [lightMode, setLightMode] = useState(() => localStorage.getItem('summit_light_mode') === 'true');

  useEffect(() => {
    localStorage.setItem('summit_light_mode', lightMode);
    document.body.classList.toggle('light-mode', lightMode);
  }, [lightMode]);

  // Calendar Utility Definitions
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealSlots = ['Breakfast', 'Meal 1', 'Meal 2', 'Snack 1', 'Snack 2'];
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
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
        const [t, r, mp, sl, cl, wt, wwp] = await Promise.all([
          loadData(STORAGE_KEYS.tasks, []),
          loadData(STORAGE_KEYS.recipes, DEFAULT_RECIPES),
          loadData(STORAGE_KEYS.mealPlan, DEFAULT_MEAL_PLAN),
          loadData(STORAGE_KEYS.strengthLogs, []),
          loadData(STORAGE_KEYS.cardioLogs, []),
          loadData(STORAGE_KEYS.workoutTemplates, DEFAULT_WORKOUT_TEMPLATES),
          loadData(STORAGE_KEYS.weeklyWorkoutPlan, DEFAULT_WEEKLY_WORKOUT_PLAN),
        ]);
        setTasks(t);
        setRecipes(r);
        setMealPlan(mp);
        setStrengthLogs(sl);
        setCardioLogs(cl);
        setWorkoutTemplates(wt);
        setWeeklyWorkoutPlan(wwp);
      } catch (err) {
        setLoadError('Could not load saved data. Starting with a clean slate — anything you add will still try to save.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const saveToStorage = (key, data) => {
    dbSet(key, data).catch(() => {
      showToast('Save failed — your change is visible but may not persist.', true);
    });
  };

  // ---------------------------------------------------------------------------
  // TASK ENGINE ACTIONS
  // ---------------------------------------------------------------------------
  const [taskForm, setTaskForm] = useState({ name: '', dueDate: '', targetDate: '', notes: '', checklistText: '' });

  const handleCreateTask = () => {
    if (!taskForm.name.trim() || !taskForm.targetDate) return;

    const newTaskId = Date.now();
    const newChecklistItems = taskForm.checklistText
      .split('\n')
      .filter(line => line.trim())
      .map((line, idx) => ({
        id: newTaskId + idx + 100,
        name: line.trim(),
        isCompleted: false
      }));

    const newTask = {
      id: newTaskId,
      name: taskForm.name.trim(),
      dueDate: taskForm.dueDate,
      targetDate: taskForm.targetDate,
      notes: taskForm.notes,
      isCompleted: false,
      checklist: newChecklistItems
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
    setTaskForm({ name: '', dueDate: '', targetDate: '', notes: '', checklistText: '' });
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
          checklist: t.checklist.map(item => ({ ...item, isCompleted: true }))
        };
      }
      return t;
    });
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  const handleDeleteTask = (taskId) => {
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    saveToStorage(STORAGE_KEYS.tasks, updated);
  };

  // Historical completion rate across all checklist items ever created.
  // Returns null (not 0 or 1) when there's no data yet, so the UI can show
  // "no data" instead of a misleading 100%.
  const getHistoricalVelocity = () => {
    const allItems = tasks.flatMap(t => t.checklist);
    if (allItems.length === 0) return null;
    const completed = allItems.filter(item => item.isCompleted).length;
    return completed / allItems.length;
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
  // NUTRITION ENGINE ACTIONS
  // ---------------------------------------------------------------------------
  const [recipeForm, setRecipeForm] = useState({ name: '', category: 'Meal', ingredientsText: '', instructions: '' });
  const [selectedRecipeFilter, setSelectedRecipeFilter] = useState('');

  const handleCreateRecipe = () => {
    if (!recipeForm.name.trim() || !recipeForm.instructions.trim()) return;

    const newRecipe = {
      id: Date.now(),
      name: recipeForm.name.trim(),
      category: recipeForm.category,
      ingredients: recipeForm.ingredientsText.split('\n').filter(i => i.trim()),
      instructions: recipeForm.instructions.trim()
    };

    const updated = [...recipes, newRecipe];
    setRecipes(updated);
    saveToStorage(STORAGE_KEYS.recipes, updated);
    setRecipeForm({ name: '', category: 'Meal', ingredientsText: '', instructions: '' });
    setCurrentPage('View Cookbook');
  };

  const handleDeleteRecipe = (id) => {
    const updated = recipes.filter(r => r.id !== id);
    setRecipes(updated);
    saveToStorage(STORAGE_KEYS.recipes, updated);
  };

  const handleSaveMealPlan = (day, slot, recipeName) => {
    const updated = { ...mealPlan, [`${day}_${slot}`]: recipeName };
    setMealPlan(updated);
    saveToStorage(STORAGE_KEYS.mealPlan, updated);
  };

  // Shopping list aggregated from every meal currently scheduled this week
  const getAutoGeneratedShoppingList = () => {
    const neededRecipes = Object.values(mealPlan).filter(
      name => name && name !== 'None' && name !== 'Flight'
    );

    const frequencyMap = {};
    neededRecipes.forEach(name => {
      const found = recipes.find(r => r.name === name);
      if (found) {
        found.ingredients.forEach(ing => {
          frequencyMap[ing] = (frequencyMap[ing] || 0) + 1;
        });
      }
    });

    return Object.entries(frequencyMap).map(([ingredient, count]) => ({ ingredient, count }));
  };

  // ---------------------------------------------------------------------------
  // FITNESS ENGINE ACTIONS
  // ---------------------------------------------------------------------------
  const [workoutTemplateForm, setWorkoutTemplateForm] = useState({ name: '', exercisesText: '' });
  const [cardioForm, setCardioForm] = useState({ activity: 'Running', duration: 30, distance: 5 });
  const [strengthLogInputs, setStrengthLogInputs] = useState({});
  const [justLogged, setJustLogged] = useState({});

  const handleCreateWorkoutTemplate = () => {
    if (!workoutTemplateForm.name.trim() || !workoutTemplateForm.exercisesText.trim()) return;

    const newTemplate = {
      id: Date.now(),
      name: workoutTemplateForm.name.trim(),
      exercises: workoutTemplateForm.exercisesText.split('\n').filter(line => line.trim())
    };

    const updated = [...workoutTemplates, newTemplate];
    setWorkoutTemplates(updated);
    saveToStorage(STORAGE_KEYS.workoutTemplates, updated);
    setWorkoutTemplateForm({ name: '', exercisesText: '' });
  };

  const handleDeleteTemplate = (id) => {
    const updated = workoutTemplates.filter(t => t.id !== id);
    setWorkoutTemplates(updated);
    saveToStorage(STORAGE_KEYS.workoutTemplates, updated);
  };

  const handleUpdateWeeklyWorkout = (day, templateName) => {
    const updated = { ...weeklyWorkoutPlan, [day]: templateName };
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
      <div className="min-h-screen bg-[#060309] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 w-72">
          <div className="text-center">
            <div className="text-2xl font-bold text-white tracking-widest uppercase">Summit</div>
            <div className="text-xs text-[#a3a8cc] tracking-widest mt-1">Command Center</div>
          </div>
          <div className={`w-full flex flex-col gap-3 transition-all ${passwordError ? 'animate-bounce' : ''}`}>
            <input
              type="password"
              placeholder="Password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              autoFocus
              className={`w-full bg-white/5 border ${passwordError ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#c2547e] transition-colors`}
            />
            <button
              onClick={handleUnlock}
              className="w-full bg-[#c2547e] text-black font-bold text-sm py-3 rounded-lg hover:bg-[#ff33b3] transition-colors"
            >
              Unlock
            </button>
            {passwordError && <p className="text-red-400 text-xs text-center">Incorrect password</p>}
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
      <div className="min-h-screen bg-[#060309] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#c2547e]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-mono uppercase tracking-widest">Bringing systems online…</span>
        </div>
      </div>
    );
  }

  const velocity = getHistoricalVelocity();
  const overdueTasks = getOverdueTasks();

  return (
    <div className={`min-h-screen ${lightMode ? '' : 'bg-[#060309]'} text-[#a3a8cc] font-sans antialiased pb-20 selection:bg-[#c2547e] selection:text-black`}>
      {/* GLOWING SYSTEM RADIAL OVERLAYS */}
      {!lightMode && <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,#160a1d_0%,#060309_100%)] pointer-events-none z-0"></div>}

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-xs font-mono uppercase tracking-wide shadow-xl flex items-center gap-2 ${
            toast.isError
              ? 'bg-red-950/90 border-red-500/40 text-red-300'
              : 'bg-[#120b1c]/95 border-[#c2547e]/40 text-[#c2547e]'
          }`}
        >
          {toast.isError && <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {loadError && (
          <div className="mb-6 bg-red-950/40 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* CYBERNETIC INTEGRATION HERO TITLE HEADER */}
        <header className="mb-8 border-l-4 border-[#c2547e] pl-4 py-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#c2547e] tracking-wider uppercase drop-shadow-[0_0_15px_rgba(255,0,160,0.45)]">
              Summit Command Center
            </h1>
            <p className="text-xs font-mono text-[#7b7f9e] uppercase tracking-widest mt-1">
              SYSTEM LEVEL v3.1 // CYBERNETIC BIO-HUD ONLINE
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="mode-toggle flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#c2547e]/30 hover:border-[#c2547e] transition-all"
              onClick={() => setLightMode(m => !m)}
              title={lightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              <Sun className={`w-3.5 h-3.5 ${lightMode ? 'text-[#c2547e]' : 'text-[#7b7f9e]'}`} />
              <div className="relative w-8 h-4">
                <div className={`absolute inset-0 rounded-full transition-colors duration-300 ${lightMode ? 'bg-[#c2547e]/20' : 'bg-[#1a0f26]'}`}></div>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-[#c2547e] shadow transition-all duration-300 ${lightMode ? 'left-[18px]' : 'left-0.5'}`}></div>
              </div>
              <Moon className={`w-3.5 h-3.5 ${!lightMode ? 'text-[#c2547e]' : 'text-[#7b7f9e]'}`} />
            </button>

            <div className="flex gap-2 bg-[#120b1c] border border-[#c2547e]/20 rounded-lg px-3 py-1.5 text-xs font-mono">
              <span className="text-[#c2547e] animate-pulse">●</span>
              <span>SAT SCAN ACTIVE // CHRONO-MATRIX ONLINE</span>
            </div>
          </div>
        </header>

        {/* CORE TELEPORT NAVIGATION DESK */}
        <nav className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { id: 'Main Hub', label: 'Main Hub', icon: Activity, match: (p) => p === 'Main Hub' },
            { id: 'Task Dashboard', label: 'Task Distributor', icon: CheckSquare, match: (p) => p === 'Task Dashboard' },
            { id: 'Recipe Dashboard', label: 'Nutrition Planner', icon: Utensils, match: (p) => p.includes('Recipe') || p.includes('Cookbook') || p.includes('Planner') },
            { id: 'Fitness Dashboard', label: 'Fitness Deck', icon: Dumbbell, match: (p) => p === 'Fitness Dashboard' }
          ].map(({ id, label, icon: Icon, match }) => (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              className={`flex items-center justify-center gap-2 font-mono py-3 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                match(currentPage)
                  ? 'bg-[#c2547e] text-[#060309] border-[#c2547e] shadow-[0_0_20px_rgba(255,0,160,0.4)]'
                  : 'bg-[#1f0b2a]/40 text-[#c2547e] border-[#c2547e]/30 hover:bg-[#c2547e] hover:text-[#060309] hover:border-[#c2547e]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* =====================================================================
            SCREEN: MAIN HUB
            ===================================================================== */}
        {currentPage === 'Main Hub' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="lg:col-span-2 space-y-6">

              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#d946ef] tracking-wide uppercase drop-shadow-[0_0_10px_rgba(217,70,239,0.3)]">
                      Active Operational Frame
                    </h2>
                    <p className="text-sm font-mono mt-1 text-[#7b7f9e]">
                      Timeline: <span className="text-[#c2547e] font-bold">{todayDayName.toUpperCase()}</span> | Chrono Lock: {formatToSwissDate(new Date().toISOString().split('T')[0])}
                    </p>
                  </div>
                  <div className="bg-[#0c0712] border border-[#c2547e]/20 rounded-xl px-4 py-2 font-mono text-xs flex gap-4">
                    <div>Lifts logged: <span className="text-[#c2547e] font-bold">{strengthLogs.length}</span></div>
                    <div>Cardio log: <span className="text-[#d946ef] font-bold">{cardioLogs.length}</span></div>
                  </div>
                </div>
              </div>

              {overdueTasks.length > 0 && (
                <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-5 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-wide">
                      {overdueTasks.length} Task{overdueTasks.length > 1 ? 's' : ''} Past Hard Deadline
                    </h3>
                    <p className="text-xs text-red-300/80 mt-1 font-mono">
                      {overdueTasks.map(t => t.name).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Nutrition Allocator */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 hover:border-[#d946ef]/50 transition-all duration-300 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#c2547e]" />
                  Fuel Map Deployed Today
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {mealSlots.map(slot => {
                    const assignedMeal = mealPlan[`${todayDayName}_${slot}`];
                    return (
                      <div key={slot} className="bg-[#0c0712] border border-[#c2547e]/15 p-3 rounded-xl flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-mono text-[#7b7f9e] block mb-1">{slot}</span>
                        {assignedMeal && assignedMeal !== 'None' ? (
                          <span className="text-xs font-bold text-white leading-tight break-words">{assignedMeal}</span>
                        ) : (
                          <span className="text-[10px] font-mono text-[#4a4d66] italic">System Idle</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gym Performance Panel */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 hover:border-[#d946ef]/50 transition-all duration-300 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-[#c2547e]" />
                  Today's Training Load
                </h3>

                <TodaysWorkoutPanel
                  weeklyWorkoutPlan={weeklyWorkoutPlan}
                  workoutTemplates={workoutTemplates}
                  todayDayName={todayDayName}
                  strengthLogInputs={strengthLogInputs}
                  setStrengthLogInputs={setStrengthLogInputs}
                  justLogged={justLogged}
                  strengthKey={strengthKey}
                  onLog={handleLogStrengthFromHub}
                />
              </div>

              {/* Dynamic Task Allocator Checkpoints */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 hover:border-[#d946ef]/50 transition-all duration-300 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-[#c2547e]" />
                  Today's Allocated Milestones
                </h3>

                {tasks.filter(t => !t.isCompleted).length === 0 ? (
                  <p className="text-xs text-[#7b7f9e] italic font-mono">No active operational tasks scheduled. High-performance state achieved.</p>
                ) : (
                  <div className="space-y-4">
                    {tasks.filter(t => !t.isCompleted).map(task => {
                      const progressPct = task.checklist.length > 0
                        ? Math.round((task.checklist.filter(item => item.isCompleted).length / task.checklist.length) * 100)
                        : 0;
                      return (
                        <div key={task.id} className="bg-[#0c0712] border border-[#c2547e]/15 p-4 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="text-xs font-bold text-white block uppercase tracking-wide">{task.name}</span>
                              <span className="text-[10px] font-mono text-[#7b7f9e]">Target Horizon: {formatToSwissDate(task.targetDate)}</span>
                            </div>
                            <span className="text-xs font-mono font-semibold text-[#d946ef] bg-[#d946ef]/10 px-2 py-0.5 rounded-full border border-[#d946ef]/20">
                              {progressPct}% COMPLETED
                            </span>
                          </div>

                          <div className="w-full bg-[#1a0f26] h-1.5 rounded-full mb-3 overflow-hidden border border-[#c2547e]/10">
                            <div className="bg-gradient-to-r from-[#d946ef] to-[#c2547e] h-full" style={{ width: `${progressPct}%` }}></div>
                          </div>

                          {task.checklist.length === 0 ? (
                            <div className="flex justify-between items-center pt-2">
                              <span className="text-xs italic text-[#7b7f9e]">Mark task completed directly on completion</span>
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                className="bg-[#c2547e]/10 hover:bg-[#c2547e] text-[#c2547e] hover:text-[#060309] border border-[#c2547e]/30 text-[10px] font-mono font-bold uppercase tracking-wider py-1.5 px-3 rounded-full transition-all"
                              >
                                Complete Task
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                              {task.checklist.map(item => (
                                <label key={item.id} className="flex items-center gap-3 bg-[#120b1c]/60 p-2 rounded-lg border border-[#c2547e]/10 hover:border-[#c2547e]/35 cursor-pointer transition-all">
                                  <input
                                    type="checkbox"
                                    className="accent-[#c2547e]"
                                    checked={item.isCompleted}
                                    onChange={() => handleToggleSubtask(task.id, item.id)}
                                  />
                                  <span className={`text-xs ${item.isCompleted ? 'line-through text-[#4a4d66]' : 'text-[#a3a8cc]'}`}>
                                    {item.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* COLUMN 3: SYSTEM SIDE PANEL FORECASTS */}
            <div className="space-y-6">

              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#c2547e]" />
                  Chronological Horizon
                </h3>

                <div className="space-y-4">
                  {[1, 2, 3].map(offset => {
                    const nextDateObj = new Date();
                    nextDateObj.setDate(nextDateObj.getDate() + offset);
                    const nextDayName = nextDateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    const nextDateStr = nextDateObj.toISOString().split('T')[0];

                    const mealListForDay = Object.entries(mealPlan)
                      .filter(([key]) => key.startsWith(nextDayName))
                      .map(([_, name]) => name)
                      .filter(name => name && name !== 'None');

                    const assignedWorkout = weeklyWorkoutPlan[nextDayName] || 'Rest Day';
                    const activeMilestonesCount = getDistributedMilestonesCount(nextDateStr);

                    return (
                      <div key={offset} className="bg-[#0c0712] border border-[#c2547e]/15 p-4 rounded-xl hover:border-[#c2547e]/40 transition-all duration-300">
                        <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-[#d946ef] uppercase font-mono">{nextDayName.toUpperCase()}</span>
                          <span className="text-[10px] font-mono text-[#7b7f9e]">{formatToSwissDate(nextDateStr)}</span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[#7b7f9e]">Lifting Routine:</span>
                            <span className="font-semibold text-white">{assignedWorkout}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#7b7f9e]">Planned Meals:</span>
                            <span className="font-semibold text-white">
                              {mealListForDay.length > 0 ? `${mealListForDay.length} planned` : 'Rest Mode'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#7b7f9e]">Predictive Load:</span>
                            <span className="font-semibold text-[#c2547e]">{activeMilestonesCount} Milestones</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cybernetic Telemetry Health Log Widget */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#c2547e]" />
                  Telemetry Diagnostic
                </h3>
                <div className="space-y-4 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#7b7f9e]">System Status:</span>
                    <span className="text-[#c2547e] font-bold">OPTIMAL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7b7f9e]">Reagent Stockpile:</span>
                    <span className="text-white">{recipes.length} Recipe Maps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7b7f9e]">Active Loadouts:</span>
                    <span className="text-white">{workoutTemplates.length} Gym Blueprints</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7b7f9e]">Chronological Cache:</span>
                    <span className="text-[#d946ef] font-bold">SAVED</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* =====================================================================
            SCREEN: TASK DASHBOARD
            ===================================================================== */}
        {currentPage === 'Task Dashboard' && (
          <div className="space-y-8">

            {/* Predictive Analytical Dashboard Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-5 shadow-xl backdrop-blur-md text-center">
                <span className="text-xs uppercase font-mono text-[#a3a8cc] tracking-wider block">Historical Completion Velocity</span>
                <span className="text-3xl font-extrabold text-white block my-2">
                  {velocity === null ? '—' : `${Math.round(velocity * 100)}%`}
                </span>
                <span className="text-[10px] text-[#c2547e] font-mono uppercase">
                  {velocity === null ? 'No checklist data yet' : 'System Engine Running Secure'}
                </span>
              </div>

              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-5 shadow-xl backdrop-blur-md text-center">
                <span className="text-xs uppercase font-mono text-[#a3a8cc] tracking-wider block">Allocated Load (Today)</span>
                <span className="text-3xl font-extrabold text-white block my-2">
                  {getDistributedMilestonesCount(new Date().toISOString().split('T')[0])} Chunks
                </span>
                <span className="text-[10px] text-[#7b7f9e] font-mono uppercase">Predictive Horizon Loaded</span>
              </div>

              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-5 shadow-xl backdrop-blur-md text-center">
                <span className="text-xs uppercase font-mono text-[#a3a8cc] tracking-wider block">Active Horizon Pipelines</span>
                <span className="text-3xl font-extrabold text-white block my-2">
                  {tasks.filter(t => !t.isCompleted).length} Tasks
                </span>
                <span className="text-[10px] text-[#d946ef] font-mono uppercase">
                  {overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'System Buffer Active'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Task Matrix Creator */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide mb-6">
                  Initialize Project Vector
                </h3>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Operational ID / Name</label>
                    <input
                      type="text"
                      className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#c2547e] transition-colors"
                      value={taskForm.name}
                      onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                      placeholder="e.g. Master's Thesis Sprint"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Hard Deadline (optional)</label>
                      <input
                        type="date"
                        className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#c2547e] transition-colors"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Target Date (required)</label>
                      <input
                        type="date"
                        className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#c2547e] transition-colors"
                        value={taskForm.targetDate}
                        onChange={(e) => setTaskForm({ ...taskForm, targetDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Functional Specifications</label>
                    <textarea
                      className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#c2547e] transition-colors h-24"
                      value={taskForm.notes}
                      onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                      placeholder="Operational details, specifications, etc."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Inject Checklist (One per line)</label>
                    <textarea
                      className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#c2547e] transition-colors h-28 font-mono"
                      value={taskForm.checklistText}
                      onChange={(e) => setTaskForm({ ...taskForm, checklistText: e.target.value })}
                      placeholder={'Draft chapter 1\nProcess literature base\nSynthesize results'}
                    ></textarea>
                  </div>

                  <button
                    type="button"
                    disabled={!taskForm.name.trim() || !taskForm.targetDate}
                    onClick={handleCreateTask}
                    className="w-full bg-gradient-to-r from-[#1f0b2a] to-[#0b0410] text-[#c2547e] border border-[#c2547e]/30 hover:bg-[#c2547e] hover:text-[#060309] hover:border-[#c2547e] transition-all duration-300 font-bold uppercase py-3 rounded-xl font-mono tracking-wider disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#c2547e] disabled:cursor-not-allowed"
                  >
                    Add To Queue
                  </button>
                </div>
              </div>

              {/* Backlog Systems Output list */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
                <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide">
                  Active Vector Horizonal Lines
                </h3>

                {tasks.length === 0 ? (
                  <p className="text-xs text-[#7b7f9e] italic font-mono">Backlog empty. Deployed state optimized.</p>
                ) : (
                  <div className="space-y-6 overflow-y-auto max-h-[580px] pr-2">
                    {tasks.map(t => {
                      const completedCount = t.checklist.filter(item => item.isCompleted).length;
                      const totalCount = t.checklist.length;
                      const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                      const isOverdue = overdueTasks.some(ot => ot.id === t.id);

                      return (
                        <div key={t.id} className={`bg-[#0c0712] border rounded-xl p-5 relative transition-all duration-300 ${
                          t.isCompleted ? 'border-white/5 opacity-60' : isOverdue ? 'border-red-500/40' : 'border-[#c2547e]/15 hover:border-[#c2547e]/40'
                        }`}>
                          <div className="flex justify-between items-start mb-2 gap-4">
                            <div>
                              <h4 className="text-sm font-extrabold text-white uppercase tracking-wide">{t.name}</h4>
                              <p className={`text-[10px] font-mono mt-0.5 ${isOverdue ? 'text-red-400' : 'text-[#7b7f9e]'}`}>
                                Hard Deadline: {formatToSwissDate(t.dueDate)} | Target: {formatToSwissDate(t.targetDate)}
                                {isOverdue && ' — OVERDUE'}
                              </p>
                            </div>
                            <div className="flex gap-1.5">
                              {!t.isCompleted && (
                                <button
                                  onClick={() => handleCompleteTask(t.id)}
                                  className="text-xs text-[#d946ef] bg-[#d946ef]/10 border border-[#d946ef]/20 rounded-full px-2.5 py-1 uppercase font-mono font-bold hover:bg-[#d946ef] hover:text-black transition-all"
                                >
                                  Complete
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-full p-1.5 uppercase font-mono hover:bg-red-500 hover:text-white transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {t.notes && <p className="text-xs text-[#7b7f9e] my-3 leading-relaxed bg-[#120b1c] p-3 rounded-lg border border-white/5">{t.notes}</p>}

                          {totalCount > 0 && (
                            <div className="mt-4 space-y-3">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-[#7b7f9e]">CHECKLIST PIPELINE</span>
                                <span className="text-[#c2547e] font-bold">{completedCount}/{totalCount} DONE</span>
                              </div>
                              <div className="w-full bg-[#1a0f26] h-1 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-[#d946ef] to-[#c2547e] h-full" style={{ width: `${progressPct}%` }}></div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                                {t.checklist.map(item => (
                                  <label key={item.id} className="flex items-center gap-2 bg-[#120b1c]/40 p-2 rounded-lg border border-white/5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="accent-[#c2547e]"
                                      checked={item.isCompleted}
                                      onChange={() => handleToggleSubtask(t.id, item.id)}
                                      disabled={t.isCompleted}
                                    />
                                    <span className={`text-xs ${item.isCompleted ? 'line-through text-[#4a4d66]' : 'text-[#a3a8cc]'}`}>
                                      {item.name}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* 14-Day Forecast Chart Display */}
            <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide mb-6">
                Milestone Capacity Loading Curve (14-Day Horizon)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-7 lg:grid-cols-14 gap-3">
                {Array.from({ length: 14 }).map((_, idx) => {
                  const targetDateObj = new Date();
                  targetDateObj.setDate(targetDateObj.getDate() + idx);
                  const formattedDateStr = targetDateObj.toISOString().split('T')[0];
                  const milestonesValue = getDistributedMilestonesCount(formattedDateStr);

                  const fillHeight = Math.min(100, (milestonesValue / 5) * 100);

                  return (
                    <div key={idx} className="bg-[#0c0712] border border-[#c2547e]/10 rounded-xl p-3 flex flex-col justify-between items-center text-center">
                      <span className="text-[10px] font-mono text-[#7b7f9e]">
                        {targetDateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>

                      <div className="w-4 bg-[#1a0f26] h-24 rounded-full my-2 relative overflow-hidden border border-[#c2547e]/5 flex items-end">
                        <div
                          className="w-full bg-gradient-to-t from-[#d946ef] to-[#c2547e] rounded-full transition-all duration-500"
                          style={{ height: `${fillHeight || 10}%` }}
                        ></div>
                      </div>

                      <span className="text-xs font-bold text-white font-mono">{milestonesValue}</span>
                      <span className="text-[8px] font-mono text-[#4a4d66]">
                        {targetDateObj.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* =====================================================================
            SCREEN: RECIPE DASHBOARD
            ===================================================================== */}
        {currentPage === 'Recipe Dashboard' && (
          <div className="space-y-6">
            <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-8 shadow-xl backdrop-blur-md text-center max-w-2xl mx-auto space-y-6">
              <Utensils className="w-16 h-16 text-[#c2547e] mx-auto drop-shadow-[0_0_15px_rgba(255,0,160,0.5)]" />
              <div>
                <h2 className="text-2xl font-extrabold text-[#c2547e] tracking-wider uppercase">Nutrition Matrix Portal</h2>
                <p className="text-xs font-mono text-[#7b7f9e] mt-1">LOCK DOWN REAGENTS AND FUEL PATHWAY ALLOCATIONS</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <button
                  onClick={() => setCurrentPage('View Cookbook')}
                  className="bg-[#0c0712] border border-[#c2547e]/30 hover:border-[#c2547e] text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:shadow-[0_0_15px_rgba(255,0,160,0.2)] transition-all"
                >
                  <BookOpen className="w-6 h-6 text-[#c2547e]" />
                  <span className="text-xs uppercase font-mono font-bold tracking-wide">My Recipes</span>
                </button>

                <button
                  onClick={() => setCurrentPage('Add Recipe')}
                  className="bg-[#0c0712] border border-[#c2547e]/30 hover:border-[#c2547e] text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:shadow-[0_0_15px_rgba(255,0,160,0.2)] transition-all"
                >
                  <Plus className="w-6 h-6 text-[#c2547e]" />
                  <span className="text-xs uppercase font-mono font-bold tracking-wide">Add Blueprint</span>
                </button>

                <button
                  onClick={() => setCurrentPage('Weekly Meal Planner')}
                  className="bg-[#0c0712] border border-[#c2547e]/30 hover:border-[#c2547e] text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:shadow-[0_0_15px_rgba(255,0,160,0.2)] transition-all"
                >
                  <Calendar className="w-6 h-6 text-[#c2547e]" />
                  <span className="text-xs uppercase font-mono font-bold tracking-wide">Weekly Plan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUB-SCREEN: ADD RECIPE */}
        {currentPage === 'Add Recipe' && (
          <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide">Synthesize Recipe Map</h3>
              <button onClick={() => setCurrentPage('Recipe Dashboard')} className="text-xs font-mono text-[#7b7f9e] hover:text-white uppercase">Cancel</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Designation ID (Name)</label>
                <input
                  type="text"
                  className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#c2547e] transition-colors"
                  value={recipeForm.name}
                  onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
                  placeholder="e.g. Anabolic Rice Bowl"
                />
              </div>

              <div>
                <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Matrix Vector Classification</label>
                <select
                  className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-[#c2547e] rounded-xl p-3 focus:outline-none focus:border-[#c2547e] transition-colors font-mono"
                  value={recipeForm.category}
                  onChange={(e) => setRecipeForm({ ...recipeForm, category: e.target.value })}
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Meal">Meal</option>
                  <option value="Snack">Snacks</option>
                  <option value="Dessert">Dessert</option>
                </select>
              </div>

              <div>
                <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Reagent Inventory Checklist (One per line)</label>
                <textarea
                  className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#c2547e] transition-colors h-28 font-mono"
                  value={recipeForm.ingredientsText}
                  onChange={(e) => setRecipeForm({ ...recipeForm, ingredientsText: e.target.value })}
                  placeholder={'200g Lean Ground Beef\n100g Rice Jasmine\n50g Avocado'}
                ></textarea>
              </div>

              <div>
                <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Synthesizing Protocol (Instructions)</label>
                <textarea
                  className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#c2547e] transition-colors h-32"
                  value={recipeForm.instructions}
                  onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })}
                  placeholder="Boil rice. Grill ground beef with spices. Top with sliced avocado."
                ></textarea>
              </div>

              <button
                type="button"
                disabled={!recipeForm.name.trim() || !recipeForm.instructions.trim()}
                onClick={handleCreateRecipe}
                className="w-full bg-gradient-to-r from-[#1f0b2a] to-[#0b0410] text-[#c2547e] border border-[#c2547e]/30 hover:bg-[#c2547e] hover:text-[#060309] hover:border-[#c2547e] transition-all duration-300 font-bold uppercase py-3 rounded-xl font-mono tracking-wider disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#c2547e] disabled:cursor-not-allowed"
              >
                Write To Cookbook Registry
              </button>
            </div>
          </div>
        )}

        {/* SUB-SCREEN: VIEW COOKBOOK */}
        {currentPage === 'View Cookbook' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide">My Recipes Database</h3>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage('Recipe Dashboard')} className="bg-[#1f0b2a]/40 text-[#c2547e] border border-[#c2547e]/30 hover:bg-[#c2547e] hover:text-black hover:border-[#c2547e] transition-all text-xs font-bold font-mono uppercase px-4 py-2 rounded-full">Menu</button>
                <button onClick={() => setCurrentPage('Add Recipe')} className="bg-[#c2547e] text-black text-xs font-bold font-mono uppercase px-4 py-2 rounded-full shadow-lg hover:shadow-[0_0_15px_rgba(255,0,160,0.4)] transition-all">Add New Recipe</button>
              </div>
            </div>

            <div className="flex gap-2 border-b border-white/5 pb-4 flex-wrap">
              {['', 'Breakfast', 'Meal', 'Snack', 'Dessert'].map(cat => (
                <button
                  key={cat || 'all'}
                  onClick={() => setSelectedRecipeFilter(cat)}
                  className={`text-xs font-mono font-bold uppercase px-3 py-1.5 rounded-full border transition-all ${
                    selectedRecipeFilter === cat
                      ? 'bg-[#d946ef] text-black border-[#d946ef]'
                      : 'bg-[#120b1c]/60 text-[#a3a8cc] border-white/5 hover:border-[#c2547e]/30'
                  }`}
                >
                  {cat || 'ALL MATRIX'}
                </button>
              ))}
            </div>

            {recipes.length === 0 ? (
              <p className="text-xs text-[#7b7f9e] font-mono text-center py-10">No blueprint models identified inside standard memory.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recipes
                  .filter(r => !selectedRecipeFilter || r.category === selectedRecipeFilter)
                  .map(recipe => (
                    <div key={recipe.id} className="bg-[#120b1c]/80 border border-[#d946ef]/15 hover:border-[#d946ef]/40 rounded-2xl p-5 shadow-xl transition-all duration-300">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-base font-extrabold text-white uppercase tracking-wide">{recipe.name}</h4>
                          <span className="bg-[#d946ef]/10 text-[#d946ef] border border-[#d946ef]/25 text-[10px] font-mono px-2 py-0.5 rounded-full mt-1 inline-block uppercase">
                            {recipe.category}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          className="text-red-500 bg-red-500/5 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-full p-2 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4 text-xs mt-4">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-[#7b7f9e] block mb-1">Critical Reagents</span>
                          <ul className="list-disc list-inside space-y-1 text-white font-mono">
                            {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                          </ul>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-mono text-[#7b7f9e] block mb-1">Cooking steps</span>
                          <p className="text-[#a3a8cc] leading-relaxed bg-[#0c0712] p-3 rounded-xl border border-white/5">{recipe.instructions}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-SCREEN: WEEKLY MEAL PLANNER */}
        {currentPage === 'Weekly Meal Planner' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide">Weekly Rotational Scheduler</h3>
              <button onClick={() => setCurrentPage('Recipe Dashboard')} className="bg-[#1f0b2a]/40 text-[#c2547e] border border-[#c2547e]/30 hover:bg-[#c2547e] hover:text-black hover:border-[#c2547e] transition-all text-xs font-bold font-mono uppercase px-4 py-2 rounded-full">Menu</button>
            </div>

            <div className="space-y-6">
              {daysOfWeek.map(day => (
                <div key={day} className="bg-[#120b1c]/80 border border-[#d946ef]/15 rounded-2xl p-5 shadow-xl">
                  <h4 className="text-sm font-bold text-[#d946ef] uppercase font-mono border-b border-white/5 pb-2 mb-3">{day.toUpperCase()} SECTORS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {mealSlots.map(slot => {
                      const value = mealPlan[`${day}_${slot}`] || 'None';
                      return (
                        <div key={slot} className="space-y-1 text-xs">
                          <label className="block text-[10px] uppercase font-mono text-[#7b7f9e]">{slot}</label>
                          <select
                            className="w-full bg-[#0c0712] border border-[#c2547e]/20 text-white rounded-lg p-2 focus:outline-none focus:border-[#c2547e]"
                            value={value}
                            onChange={(e) => handleSaveMealPlan(day, slot, e.target.value)}
                          >
                            <option value="None">None (Rest)</option>
                            <option value="Flight">Special Option (Flight)</option>
                            {recipes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Integrated Procurement Generator */}
            <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide mb-2 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#c2547e]" />
                Auto-Generated Procurement List
              </h3>
              <p className="text-[11px] font-mono text-[#7b7f9e] mb-4">INVENTORY CHECKLIST CALCULATED DIRECTLY FROM THE ACTIVE WEEKLY ROTATIONAL MEALS</p>

              {getAutoGeneratedShoppingList().length === 0 ? (
                <p className="text-xs text-[#7b7f9e] italic font-mono">Nutrition maps are clear. Supply levels verified.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getAutoGeneratedShoppingList().map(({ ingredient, count }, idx) => (
                    <label key={idx} className="flex items-center gap-3 bg-[#0c0712] border border-[#c2547e]/10 hover:border-[#c2547e]/30 p-3 rounded-xl transition-all cursor-pointer">
                      <input type="checkbox" className="accent-[#c2547e] w-4 h-4 rounded" />
                      <div className="text-xs font-mono">
                        <span className="text-white font-bold">{ingredient}</span>
                        <span className="text-[#c2547e] ml-2 font-extrabold">({count}x deployed)</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* =====================================================================
            SCREEN: FITNESS DASHBOARD
            ===================================================================== */}
        {currentPage === 'Fitness Dashboard' && (
          <div className="space-y-8">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-5 shadow-xl backdrop-blur-md text-center">
                <span className="text-xs uppercase font-mono text-[#a3a8cc] tracking-wider block">Cumulative Lifts Volume</span>
                <span className="text-3xl font-extrabold text-white block my-2">
                  {getTotalKineticVolume().toLocaleString()} KG
                </span>
                <span className="text-[10px] text-[#c2547e] font-mono uppercase">Force Matrix Unlocked</span>
              </div>

              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-5 shadow-xl backdrop-blur-md text-center">
                <span className="text-xs uppercase font-mono text-[#a3a8cc] tracking-wider block">Aerobic Kinetic Output</span>
                <span className="text-3xl font-extrabold text-white block my-2">
                  {getTotalCardioMinutes()} Mins
                </span>
                <span className="text-[10px] text-[#7b7f9e] font-mono uppercase">Mitochondrial Output Optimized</span>
              </div>

              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-5 shadow-xl backdrop-blur-md text-center">
                <span className="text-xs uppercase font-mono text-[#a3a8cc] tracking-wider block">Logged Bio-Telemetry Points</span>
                <span className="text-3xl font-extrabold text-white block my-2">
                  {strengthLogs.length + cardioLogs.length} Packets
                </span>
                <span className="text-[10px] text-[#d946ef] font-mono uppercase">Bio-Telemetry Loop Lock</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              <div className="space-y-6">

                {/* Physical Template Builder Panel */}
                <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide mb-4">
                    Workout Blueprint Constructor
                  </h3>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Routine Designation ID (Name)</label>
                      <input
                        type="text"
                        className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#c2547e]"
                        value={workoutTemplateForm.name}
                        onChange={(e) => setWorkoutTemplateForm({ ...workoutTemplateForm, name: e.target.value })}
                        placeholder="e.g. Back and Biceps Destructor"
                      />
                    </div>
                    <div>
                      <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Log Exercises (One per line)</label>
                      <textarea
                        className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#c2547e] h-24 font-mono"
                        value={workoutTemplateForm.exercisesText}
                        onChange={(e) => setWorkoutTemplateForm({ ...workoutTemplateForm, exercisesText: e.target.value })}
                        placeholder={'Weighted pullups\nBarbell Rows\nIncline Dumbbell Curls'}
                      ></textarea>
                    </div>
                    <button
                      type="button"
                      disabled={!workoutTemplateForm.name.trim() || !workoutTemplateForm.exercisesText.trim()}
                      onClick={handleCreateWorkoutTemplate}
                      className="w-full bg-gradient-to-r from-[#1f0b2a] to-[#0b0410] text-[#c2547e] border border-[#c2547e]/30 hover:bg-[#c2547e] hover:text-[#060309] hover:border-[#c2547e] transition-all duration-300 font-bold uppercase py-2.5 rounded-xl font-mono tracking-wider disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#c2547e] disabled:cursor-not-allowed"
                    >
                      Write Blueprint Frame
                    </button>
                  </div>

                  <div className="mt-6 space-y-3">
                    <span className="text-[10px] uppercase font-mono text-[#7b7f9e] block">Stored Blueprints</span>
                    {workoutTemplates.length === 0 ? (
                      <span className="text-[10px] italic font-mono text-[#4a4d66]">No blueprints created yet</span>
                    ) : (
                      workoutTemplates.map(t => (
                        <div key={t.id} className="bg-[#0c0712] border border-white/5 p-3 rounded-xl flex justify-between items-center">
                          <div>
                            <strong className="text-xs text-white uppercase block">{t.name}</strong>
                            <span className="text-[10px] font-mono text-[#7b7f9e]">{t.exercises.join(', ')}</span>
                          </div>
                          <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-full transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Training Rotational Scheduler */}
                <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide">
                      Weekly Rotational Training Plan
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApplyWeekPreset(RUN_WEEK)}
                        className="text-[10px] font-mono font-bold uppercase px-3 py-1.5 rounded-full border border-[#c2547e]/40 text-[#c2547e] hover:bg-[#c2547e] hover:text-white transition-all"
                      >
                        Run Week
                      </button>
                      <button
                        onClick={() => handleApplyWeekPreset(REST_WEEK)}
                        className="text-[10px] font-mono font-bold uppercase px-3 py-1.5 rounded-full border border-[#d946ef]/40 text-[#d946ef] hover:bg-[#d946ef] hover:text-white transition-all"
                      >
                        Rest Week
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 text-xs">
                    {daysOfWeek.map(day => (
                      <div key={day} className="flex justify-between items-center bg-[#0c0712] border border-[#c2547e]/10 p-2.5 rounded-xl">
                        <span className="font-mono text-white text-[11px] font-bold uppercase">{day}</span>
                        <select
                          className="bg-[#120b1c] border border-[#c2547e]/20 text-[#c2547e] rounded px-2 py-1 text-xs focus:outline-none"
                          value={weeklyWorkoutPlan[day] || 'Rest Day'}
                          onChange={(e) => handleUpdateWeeklyWorkout(day, e.target.value)}
                        >
                          <option value="Rest Day">Rest Day</option>
                          <option value="Run Day">Run Day</option>
                          {workoutTemplates.map(tmpl => <option key={tmpl.id} value={tmpl.name}>{tmpl.name}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Logging Systems output panels */}
              <div className="space-y-6">

                {/* Manual Aerobic Intake Entry */}
                <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide mb-4">
                    Log Aerobic Session
                  </h3>
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Module type</label>
                        <select
                          className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-[#c2547e] rounded-xl p-2.5 focus:outline-none"
                          value={cardioForm.activity}
                          onChange={(e) => setCardioForm({ ...cardioForm, activity: e.target.value })}
                        >
                          <option value="Running">Running</option>
                          <option value="Cycling">Cycling</option>
                          <option value="Swimming">Swimming</option>
                          <option value="Rowing">Rowing Machine</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Duration (Min)</label>
                        <input
                          type="number"
                          className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-2.5 focus:outline-none"
                          value={cardioForm.duration}
                          onChange={(e) => setCardioForm({ ...cardioForm, duration: e.target.value })}
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Distance (KM)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full bg-[#0c0712] border border-[#c2547e]/25 text-white rounded-xl p-2.5 focus:outline-none"
                          value={cardioForm.distance}
                          onChange={(e) => setCardioForm({ ...cardioForm, distance: e.target.value })}
                          min="0"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogManualCardio}
                      disabled={!cardioForm.duration || Number(cardioForm.duration) <= 0}
                      className="w-full bg-gradient-to-r from-[#1f0b2a] to-[#0b0410] text-[#c2547e] border border-[#c2547e]/30 hover:bg-[#c2547e] hover:text-[#060309] hover:border-[#c2547e] transition-all duration-300 font-bold uppercase py-2.5 rounded-xl font-mono tracking-wider disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#c2547e] disabled:cursor-not-allowed"
                    >
                      Write Cardio Telemetry
                    </button>
                  </div>
                </div>

                {/* Training Chronological Databases */}
                <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-md font-bold text-[#c2547e] uppercase tracking-wide mb-4">
                    Historical Log Archive
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#7b7f9e] block mb-2">Strength Record History</span>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {strengthLogs.length === 0 ? (
                          <span className="text-[10px] italic font-mono text-[#4a4d66]">No records logged</span>
                        ) : (
                          strengthLogs.slice().reverse().map(log => (
                            <div key={log.id} className="bg-[#0c0712] border border-white/5 p-2 rounded-lg flex justify-between items-center text-[11px]">
                              <div>
                                <span className="text-[#d946ef] font-bold block">{log.exercise.toUpperCase()}</span>
                                <span className="text-white font-mono">{log.weight}KG x {log.sets}x{log.reps}</span>
                              </div>
                              <button onClick={() => handleDeleteStrengthLog(log.id)} className="text-red-500 hover:bg-red-500/15 p-1 rounded-full transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#7b7f9e] block mb-2">Cardio Performance Logs</span>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {cardioLogs.length === 0 ? (
                          <span className="text-[10px] italic font-mono text-[#4a4d66]">No records logged</span>
                        ) : (
                          cardioLogs.slice().reverse().map(log => (
                            <div key={log.id} className="bg-[#0c0712] border border-white/5 p-2 rounded-lg flex justify-between items-center text-[11px]">
                              <div>
                                <span className="text-[#c2547e] font-bold block">{log.activity.toUpperCase()}</span>
                                <span className="text-white font-mono">{log.duration} Min | {log.distance} KM</span>
                              </div>
                              <button onClick={() => handleDeleteCardioLog(log.id)} className="text-red-500 hover:bg-red-500/15 p-1 rounded-full transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extracted subcomponent: today's workout panel.
// Pulled out mainly because it previously contained an IIFE buried in JSX
// plus a direct DOM-mutation hack for the "locked" button feedback. Now it's
// a normal component driven entirely by props/state.
// ---------------------------------------------------------------------------
function TodaysWorkoutPanel({
  weeklyWorkoutPlan,
  workoutTemplates,
  todayDayName,
  strengthLogInputs,
  setStrengthLogInputs,
  justLogged,
  strengthKey,
  onLog
}) {
  const todaysRoutine = weeklyWorkoutPlan[todayDayName];

  if (!todaysRoutine || todaysRoutine === 'None' || todaysRoutine === 'Rest Day') {
    return (
      <div className="text-center py-6">
        <span className="text-sm font-mono text-[#7b7f9e] uppercase tracking-wider block">REST SEQUENCE ACTIVE</span>
        <span className="text-xs text-[#4a4d66] mt-1 block">Muscle protein synthesis optimized. Reagents absorbing.</span>
      </div>
    );
  }

  const activeTemplate = workoutTemplates.find(t => t.name === todaysRoutine);
  if (!activeTemplate || !activeTemplate.exercises.length) {
    return (
      <div className="text-center py-4 text-xs text-[#7b7f9e]">
        No active exercises found inside custom blueprint: "{todaysRoutine}"
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#c2547e]/10 border border-[#c2547e]/30 rounded-xl p-3 flex justify-between items-center">
        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">ACTIVE WORKOUT MATRIX: {todaysRoutine.toUpperCase()}</span>
        <span className="bg-[#c2547e] text-black text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase">LIVE RECORDING</span>
      </div>

      <div className="space-y-3">
        {activeTemplate.exercises.map((exercise, index) => {
          const key = strengthKey(todaysRoutine, exercise);
          const userInputs = strengthLogInputs[key] || { weight: 40, sets: 3, reps: 8 };
          const isLocked = justLogged[key];

          return (
            <div key={index} className="bg-[#0c0712] border border-[#c2547e]/10 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <span className="text-xs font-bold text-[#d946ef] min-w-[150px]">{exercise.toUpperCase()}</span>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="flex-1 md:flex-initial">
                  <span className="text-[9px] uppercase font-mono text-[#7b7f9e] block mb-1">Weight KG</span>
                  <input
                    type="number"
                    className="bg-[#120b1c] border border-[#c2547e]/25 text-[#c2547e] rounded-lg px-2 py-1 text-xs font-mono w-full md:w-20"
                    value={userInputs.weight}
                    onChange={(e) => setStrengthLogInputs(prev => ({
                      ...prev,
                      [key]: { ...userInputs, weight: e.target.value }
                    }))}
                    min="0"
                    step="0.5"
                  />
                </div>
                <div className="flex-1 md:flex-initial">
                  <span className="text-[9px] uppercase font-mono text-[#7b7f9e] block mb-1">Sets</span>
                  <input
                    type="number"
                    className="bg-[#120b1c] border border-[#c2547e]/25 text-[#c2547e] rounded-lg px-2 py-1 text-xs font-mono w-full md:w-16"
                    value={userInputs.sets}
                    onChange={(e) => setStrengthLogInputs(prev => ({
                      ...prev,
                      [key]: { ...userInputs, sets: e.target.value }
                    }))}
                    min="1"
                  />
                </div>
                <div className="flex-1 md:flex-initial">
                  <span className="text-[9px] uppercase font-mono text-[#7b7f9e] block mb-1">Reps</span>
                  <input
                    type="number"
                    className="bg-[#120b1c] border border-[#c2547e]/25 text-[#c2547e] rounded-lg px-2 py-1 text-xs font-mono w-full md:w-16"
                    value={userInputs.reps}
                    onChange={(e) => setStrengthLogInputs(prev => ({
                      ...prev,
                      [key]: { ...userInputs, reps: e.target.value }
                    }))}
                    min="1"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => onLog(todaysRoutine, exercise)}
                style={{ borderColor: isLocked ? '#d946ef' : 'rgba(255, 0, 160, 0.3)' }}
                className="w-full md:w-auto bg-gradient-to-r from-[#1f0b2a] to-[#0b0410] text-[#c2547e] border hover:bg-[#c2547e] hover:text-[#060309] hover:border-[#c2547e] transition-all duration-300 text-[10px] font-bold font-mono py-2 px-4 rounded-full uppercase tracking-wider"
              >
                {isLocked ? 'DATA PACKET LOCKED' : 'LOCK DATA SET'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}