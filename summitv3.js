import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  BookOpen, 
  CheckSquare, 
  Calendar, 
  Plus, 
  Trash2, 
  TrendingUp, 
  ChevronRight, 
  Utensils, 
  Clock, 
  ShoppingBag, 
  Check, 
  Dumbbell, 
  Sparkles,
  Save,
  XCircle
} from 'lucide-react';

export default function App() {
  // Global State Engine
  const [currentPage, setCurrentPage] = useState('Main Hub');
  const [tasks, setTasks] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState({});
  const [strengthLogs, setStrengthLogs] = useState([]);
  const [cardioLogs, setCardioLogs] = useState([]);
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [weeklyWorkoutPlan, setWeeklyWorkoutPlan] = useState({
    Monday: 'Rest Day', Tuesday: 'Rest Day', Wednesday: 'Rest Day',
    Thursday: 'Rest Day', Friday: 'Rest Day', Saturday: 'Rest Day', Sunday: 'Rest Day'
  });

  // Calendar Utility Definitions
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const mealSlots = ["Breakfast", "Meal 1", "Meal 2", "Snack 1", "Snack 2"];
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Load database structures on startup
  useEffect(() => {
    const loadData = (key, fallback) => {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    };

    setTasks(loadData('summit_tasks', []));
    setRecipes(loadData('summit_recipes', [
      {
        id: 1,
        name: "Protein Oats Complex",
        category: "Breakfast",
        ingredients: ["Oats (50g)", "Whey Protein (30g)", "Blueberries (50g)", "Almond Milk (150ml)"],
        instructions: "Mix oats and almond milk. Microwave for 90s. Stir in protein powder, top with berries."
      },
      {
        id: 2,
        name: "Lean Chicken Rice Matrix",
        category: "Meal",
        ingredients: ["Chicken Breast (200g)", "Basmati Rice (75g)", "Broccoli Florets (100g)", "Olive Oil (10g)"],
        instructions: "Grill chicken with spices. Boil rice. Steam broccoli. Combine and drizzle with oil."
      }
    ]));
    setMealPlan(loadData('summit_meal_plan', {
      'Monday_Breakfast': 'Protein Oats Complex',
      'Monday_Meal 1': 'Lean Chicken Rice Matrix',
      'Wednesday_Meal 1': 'Lean Chicken Rice Matrix'
    }));
    setStrengthLogs(loadData('summit_strength_logs', []));
    setCardioLogs(loadData('summit_cardio_logs', []));
    setWorkoutTemplates(loadData('summit_workout_templates', [
      { id: 1, name: "Lower Deck Alpha", exercises: ["Squat", "Leg Press", "Calf Raise"] },
      { id: 2, name: "Upper Deck Prime", exercises: ["Bench Press", "Lat Pulldown", "Shoulder Press", "Bicep Curl"] }
    ]));
    setWeeklyWorkoutPlan(loadData('summit_weekly_workout_plan', {
      Monday: 'Lower Deck Alpha', Tuesday: 'Rest Day', Wednesday: 'Upper Deck Prime',
      Thursday: 'Rest Day', Friday: 'Lower Deck Alpha', Saturday: 'Rest Day', Sunday: 'Rest Day'
    }));
  }, []);

  // Sync Helper to persist database changes
  const saveToStorage = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // ---------------------------------------------------------------------------
  // TASK ENGINE ACTIONS
  // ---------------------------------------------------------------------------
  const [taskForm, setTaskForm] = useState({ name: '', dueDate: '', targetDate: '', notes: '', checklistText: '' });
  
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskForm.name || !taskForm.targetDate) return;

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
      name: taskForm.name,
      dueDate: taskForm.dueDate,
      targetDate: taskForm.targetDate,
      notes: taskForm.notes,
      isCompleted: false,
      checklist: newChecklistItems
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    saveToStorage('summit_tasks', updated);
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
    saveToStorage('summit_tasks', updated);
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
    saveToStorage('summit_tasks', updated);
  };

  const handleDeleteTask = (taskId) => {
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    saveToStorage('summit_tasks', updated);
  };

  // Calculate task tracking metrics
  const getHistoricalVelocity = () => {
    const allItems = tasks.flatMap(t => t.checklist);
    if (allItems.length === 0) return 1.0;
    const completed = allItems.filter(item => item.isCompleted).length;
    return (completed / allItems.length);
  };

  const getDistributedMilestonesCount = (targetDateStr) => {
    let count = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const checkDate = new Date(targetDateStr);
    checkDate.setHours(0,0,0,0);

    tasks.forEach(t => {
      if (t.isCompleted) return;
      const target = new Date(t.targetDate);
      target.setHours(0,0,0,0);
      
      if (today <= checkDate && checkDate <= target) {
        const daysRemaining = Math.max(1, Math.ceil((target - today) / (1000 * 60 * 60 * 24)) + 1);
        const incompleteChecklist = t.checklist.filter(item => !item.isCompleted).length;
        const remainingMilestones = incompleteChecklist === 0 ? 1 : incompleteChecklist;
        count += Number((remainingMilestones / daysRemaining).toFixed(1));
      }
    });
    return Math.round(count * 10) / 10;
  };

  // ---------------------------------------------------------------------------
  // NUTRITION ENGINE ACTIONS
  // ---------------------------------------------------------------------------
  const [recipeForm, setRecipeForm] = useState({ name: '', category: 'Meal', ingredientsText: '', instructions: '' });
  const [selectedRecipeFilter, setSelectedRecipeFilter] = useState('');

  const handleCreateRecipe = (e) => {
    e.preventDefault();
    if (!recipeForm.name || !recipeForm.instructions) return;

    const newRecipe = {
      id: Date.now(),
      name: recipeForm.name,
      category: recipeForm.category,
      ingredients: recipeForm.ingredientsText.split('\n').filter(i => i.trim()),
      instructions: recipeForm.instructions
    };

    const updated = [...recipes, newRecipe];
    setRecipes(updated);
    saveToStorage('summit_recipes', updated);
    setRecipeForm({ name: '', category: 'Meal', ingredientsText: '', instructions: '' });
    setCurrentPage('View Cookbook');
  };

  const handleSaveMealPlan = (day, slot, recipeName) => {
    const updated = { ...mealPlan, [`${day}_${slot}`]: recipeName };
    setMealPlan(updated);
    saveToStorage('summit_meal_plan', updated);
  };

  // Generate dynamic shopping list based on the active weekly schedule meals
  const getAutoGeneratedShoppingList = () => {
    const neededRecipes = Object.entries(mealPlan)
      .filter(([_, recipeName]) => recipeName && recipeName !== 'None' && recipeName !== 'Flight')
      .map(([_, recipeName]) => recipeName);

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

  const handleCreateWorkoutTemplate = (e) => {
    e.preventDefault();
    if (!workoutTemplateForm.name || !workoutTemplateForm.exercisesText) return;

    const newTemplate = {
      id: Date.now(),
      name: workoutTemplateForm.name.trim(),
      exercises: workoutTemplateForm.exercisesText.split('\n').filter(line => line.trim())
    };

    const updated = [...workoutTemplates, newTemplate];
    setWorkoutTemplates(updated);
    saveToStorage('summit_workout_templates', updated);
    setWorkoutTemplateForm({ name: '', exercisesText: '' });
  };

  const handleDeleteTemplate = (id) => {
    const updated = workoutTemplates.filter(t => t.id !== id);
    setWorkoutTemplates(updated);
    saveToStorage('summit_workout_templates', updated);
  };

  const handleUpdateWeeklyWorkout = (day, templateName) => {
    const updated = { ...weeklyWorkoutPlan, [day]: templateName };
    setWeeklyWorkoutPlan(updated);
    saveToStorage('summit_weekly_workout_plan', updated);
  };

  const handleLogManualCardio = (e) => {
    e.preventDefault();
    const newLog = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      activity: cardioForm.activity,
      duration: Number(cardioForm.duration),
      distance: Number(cardioForm.distance)
    };
    const updated = [...cardioLogs, newLog];
    setCardioLogs(updated);
    saveToStorage('summit_cardio_logs', updated);
  };

  const handleLogStrengthFromHub = (e, exerciseName) => {
    e.preventDefault();
    const inputs = strengthLogInputs[exerciseName] || { weight: 40, sets: 3, reps: 8 };
    const newLog = {
      id: Date.now() + Math.random(),
      date: new Date().toISOString().split('T')[0],
      exercise: exerciseName,
      weight: Number(inputs.weight),
      sets: Number(inputs.sets),
      reps: Number(inputs.reps)
    };
    const updated = [...strengthLogs, newLog];
    setStrengthLogs(updated);
    saveToStorage('summit_strength_logs', updated);
    
    // Feedback effect
    const btn = e.target.querySelector('button');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = 'DATA PACKET LOCKED';
      btn.style.borderColor = '#d946ef';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.borderColor = 'rgba(255, 0, 160, 0.3)';
      }, 1500);
    }
  };

  const handleDeleteStrengthLog = (id) => {
    const updated = strengthLogs.filter(log => log.id !== id);
    setStrengthLogs(updated);
    saveToStorage('summit_strength_logs', updated);
  };

  const handleDeleteCardioLog = (id) => {
    const updated = cardioLogs.filter(log => log.id !== id);
    setCardioLogs(updated);
    saveToStorage('summit_cardio_logs', updated);
  };

  // Analytical Calculators
  const getTotalKineticVolume = () => {
    return strengthLogs.reduce((acc, log) => acc + (log.weight * log.sets * log.reps), 0);
  };

  const getTotalCardioMinutes = () => {
    return cardioLogs.reduce((acc, log) => acc + log.duration, 0);
  };

  // Swiss Date Formatting Utility (DD.MM.YYYY)
  const formatToSwissDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dateStr;
  };

  return (
    <div className="min-h-screen bg-[#060309] text-[#a3a8cc] font-sans antialiased pb-20 selection:bg-[#ff00a0] selection:text-black">
      {/* GLOWING SYSTEM RADIAL OVERLAYS */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,#160a1d_0%,#060309_100%)] pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* CYBERNETIC INTEGRATION HERO TITLE HEADER */}
        <header className="mb-8 border-l-4 border-[#ff00a0] pl-4 py-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#ff00a0] tracking-wider uppercase drop-shadow-[0_0_15px_rgba(255,0,160,0.45)]">
              Summit Command Center
            </h1>
            <p className="text-xs font-mono text-[#7b7f9e] uppercase tracking-widest mt-1">
              SYSTEM LEVEL v3.0 // CYBERNETIC BIO-HUD ONLINE
            </p>
          </div>
          <div className="flex gap-2 bg-[#120b1c] border border-[#ff00a0]/20 rounded-lg px-3 py-1.5 text-xs font-mono">
            <span className="text-[#ff00a0] animate-pulse">●</span>
            <span>SAT SCAN ACTIVE // CHRONO-MATRIX ONLINE</span>
          </div>
        </header>

        {/* CORE TELEPORT NAVIGATION DESK */}
        <nav className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <button 
            onClick={() => setCurrentPage('Main Hub')}
            className={`flex items-center justify-center gap-2 font-mono py-3 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              currentPage === 'Main Hub' 
                ? 'bg-[#ff00a0] text-[#060309] border-[#ff00a0] shadow-[0_0_20px_rgba(255,0,160,0.4)]' 
                : 'bg-[#1f0b2a]/40 text-[#ff00a0] border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-[#060309] hover:border-[#ff00a0]'
            }`}
          >
            <Activity className="w-4 h-4" />
            Main Hub
          </button>
          <button 
            onClick={() => setCurrentPage('Task Dashboard')}
            className={`flex items-center justify-center gap-2 font-mono py-3 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              currentPage === 'Task Dashboard' 
                ? 'bg-[#ff00a0] text-[#060309] border-[#ff00a0] shadow-[0_0_20px_rgba(255,0,160,0.4)]' 
                : 'bg-[#1f0b2a]/40 text-[#ff00a0] border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-[#060309] hover:border-[#ff00a0]'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Task Distributor
          </button>
          <button 
            onClick={() => setCurrentPage('Recipe Dashboard')}
            className={`flex items-center justify-center gap-2 font-mono py-3 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              currentPage.includes('Recipe') || currentPage.includes('Cookbook') || currentPage.includes('Planner')
                ? 'bg-[#ff00a0] text-[#060309] border-[#ff00a0] shadow-[0_0_20px_rgba(255,0,160,0.4)]' 
                : 'bg-[#1f0b2a]/40 text-[#ff00a0] border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-[#060309] hover:border-[#ff00a0]'
            }`}
          >
            <Utensils className="w-4 h-4" />
            Nutrition Planner
          </button>
          <button 
            onClick={() => setCurrentPage('Fitness Dashboard')}
            className={`flex items-center justify-center gap-2 font-mono py-3 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              currentPage === 'Fitness Dashboard' 
                ? 'bg-[#ff00a0] text-[#060309] border-[#ff00a0] shadow-[0_0_20px_rgba(255,0,160,0.4)]' 
                : 'bg-[#1f0b2a]/40 text-[#ff00a0] border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-[#060309] hover:border-[#ff00a0]'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Fitness Deck
          </button>
        </nav>

        {/* =====================================================================
            SCREEN: MAIN HUB
            ===================================================================== */}
        {currentPage === 'Main Hub' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMN 1 & 2: OPERATIONS CONTEXT MATRIX */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Daily Header Sub-line */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#d946ef] tracking-wide uppercase drop-shadow-[0_0_10px_rgba(217,70,239,0.3)]">
                      Active Operational Frame
                    </h2>
                    <p className="text-sm font-mono mt-1 text-[#7b7f9e]">
                      Timeline: <span className="text-[#ff00a0] font-bold">{todayDayName.toUpperCase()}</span> | Chrono Lock: {formatToSwissDate(new Date().toISOString().split('T')[0])}
                    </p>
                  </div>
                  <div className="bg-[#0c0712] border border-[#ff00a0]/20 rounded-xl px-4 py-2 font-mono text-xs flex gap-4">
                    <div>Lifts logged: <span className="text-[#ff00a0] font-bold">{strengthLogs.length}</span></div>
                    <div>Cardio log: <span className="text-[#d946ef] font-bold">{cardioLogs.length}</span></div>
                  </div>
                </div>
              </div>

              {/* Nutrition Allocator */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 hover:border-[#d946ef]/50 transition-all duration-300 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#ff00a0]" /> 
                  Fuel Map Deployed Today
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {mealSlots.map(slot => {
                    const assignedMeal = mealPlan[`${todayDayName}_${slot}`];
                    return (
                      <div key={slot} className="bg-[#0c0712] border border-[#ff00a0]/15 p-3 rounded-xl flex flex-col justify-between">
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
                <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-[#ff00a0]" />
                  Today's Training Load
                </h3>
                
                {(() => {
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
                      <div className="bg-[#ff00a0]/10 border border-[#ff00a0]/30 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">ACTIVE WORKOUT MATRIX: {todaysRoutine.toUpperCase()}</span>
                        <span className="bg-[#ff00a0] text-black text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase">LIVE RECORDING</span>
                      </div>

                      <div className="space-y-3">
                        {activeTemplate.exercises.map((exercise, index) => {
                          const userInputs = strengthLogInputs[exercise] || { weight: 40, sets: 3, reps: 8 };
                          return (
                            <form key={index} onSubmit={(e) => handleLogStrengthFromHub(e, exercise)} className="bg-[#0c0712] border border-[#ff00a0]/10 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <span className="text-xs font-bold text-[#d946ef] min-w-[150px]">{exercise.toUpperCase()}</span>
                              <div className="flex gap-2 w-full md:w-auto">
                                <div className="flex-1 md:flex-initial">
                                  <span className="text-[9px] uppercase font-mono text-[#7b7f9e] block mb-1">Weight KG</span>
                                  <input 
                                    type="number" 
                                    className="bg-[#120b1c] border border-[#ff00a0]/25 text-[#ff00a0] rounded-lg px-2 py-1 text-xs font-mono w-full md:w-20"
                                    value={userInputs.weight}
                                    onChange={(e) => setStrengthLogInputs({
                                      ...strengthLogInputs,
                                      [exercise]: { ...userInputs, weight: e.target.value }
                                    })}
                                    min="0"
                                    step="0.5"
                                  />
                                </div>
                                <div className="flex-1 md:flex-initial">
                                  <span className="text-[9px] uppercase font-mono text-[#7b7f9e] block mb-1">Sets</span>
                                  <input 
                                    type="number" 
                                    className="bg-[#120b1c] border border-[#ff00a0]/25 text-[#ff00a0] rounded-lg px-2 py-1 text-xs font-mono w-full md:w-16"
                                    value={userInputs.sets}
                                    onChange={(e) => setStrengthLogInputs({
                                      ...strengthLogInputs,
                                      [exercise]: { ...userInputs, sets: e.target.value }
                                    })}
                                    min="1"
                                  />
                                </div>
                                <div className="flex-1 md:flex-initial">
                                  <span className="text-[9px] uppercase font-mono text-[#7b7f9e] block mb-1">Reps</span>
                                  <input 
                                    type="number" 
                                    className="bg-[#120b1c] border border-[#ff00a0]/25 text-[#ff00a0] rounded-lg px-2 py-1 text-xs font-mono w-full md:w-16"
                                    value={userInputs.reps}
                                    onChange={(e) => setStrengthLogInputs({
                                      ...strengthLogInputs,
                                      [exercise]: { ...userInputs, reps: e.target.value }
                                    })}
                                    min="1"
                                  />
                                </div>
                              </div>
                              <button type="submit" className="w-full md:w-auto bg-gradient-to-r from-[#1f0b2a] to-[#0b0410] text-[#ff00a0] border border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-[#060309] hover:border-[#ff00a0] transition-all duration-300 text-[10px] font-bold font-mono py-2 px-4 rounded-full uppercase tracking-wider">
                                LOCK DATA SET
                              </button>
                            </form>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Dynamic Task Allocator Checkpoints */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 hover:border-[#d946ef]/50 transition-all duration-300 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-[#ff00a0]" />
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
                        <div key={task.id} className="bg-[#0c0712] border border-[#ff00a0]/15 p-4 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="text-xs font-bold text-white block uppercase tracking-wide">{task.name}</span>
                              <span className="text-[10px] font-mono text-[#7b7f9e]">Target Horizon: {formatToSwissDate(task.targetDate)}</span>
                            </div>
                            <span className="text-xs font-mono font-semibold text-[#d946ef] bg-[#d946ef]/10 px-2 py-0.5 rounded-full border border-[#d946ef]/20">
                              {progressPct}% COMPLETED
                            </span>
                          </div>

                          <div className="w-full bg-[#1a0f26] h-1.5 rounded-full mb-3 overflow-hidden border border-[#ff00a0]/10">
                            <div className="bg-gradient-to-r from-[#d946ef] to-[#ff00a0] h-full" style={{ width: `${progressPct}%` }}></div>
                          </div>

                          {task.checklist.length === 0 ? (
                            <div className="flex justify-between items-center pt-2">
                              <span className="text-xs italic text-[#7b7f9e]">Mark task completed directly on completion</span>
                              <button 
                                onClick={() => handleCompleteTask(task.id)}
                                className="bg-[#ff00a0]/10 hover:bg-[#ff00a0] text-[#ff00a0] hover:text-[#060309] border border-[#ff00a0]/30 text-[10px] font-mono font-bold uppercase tracking-wider py-1.5 px-3 rounded-full transition-all"
                              >
                                Complete Task
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                              {task.checklist.map(item => (
                                <label key={item.id} className="flex items-center gap-3 bg-[#120b1c]/60 p-2 rounded-lg border border-[#ff00a0]/10 hover:border-[#ff00a0]/35 cursor-pointer transition-all">
                                  <input 
                                    type="checkbox" 
                                    className="accent-[#ff00a0]" 
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
                <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#ff00a0]" />
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
                      <div key={offset} className="bg-[#0c0712] border border-[#ff00a0]/15 p-4 rounded-xl hover:border-[#ff00a0]/40 transition-all duration-300">
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
                            <span className="font-semibold text-[#ff00a0]">{activeMilestonesCount} Milestones</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cybernetic Telemetry Health Log Widget */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#ff00a0]" />
                  Telemetry Diagnostic
                </h3>
                <div className="space-y-4 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#7b7f9e]">System Status:</span>
                    <span className="text-[#ff00a0] font-bold">OPTIMAL</span>
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
                  {Math.round(getHistoricalVelocity() * 100)}%
                </span>
                <span className="text-[10px] text-[#ff00a0] font-mono uppercase">System Engine Running Secure</span>
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
                <span className="text-[10px] text-[#d946ef] font-mono uppercase">System Buffer Active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Task Matrix Creator */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-6">
                  Initialize Project Vector
                </h3>
                
                <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Operational ID / Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#ff00a0] transition-colors"
                      value={taskForm.name}
                      onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                      placeholder="e.g. Master's Thesis Sprint"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Hard Target Deadline</label>
                      <input 
                        type="date" 
                        className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#ff00a0] transition-colors"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Soft Target Deadline</label>
                      <input 
                        type="date" 
                        className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#ff00a0] transition-colors"
                        value={taskForm.targetDate}
                        onChange={(e) => setTaskForm({ ...taskForm, targetDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Functional Specifications</label>
                    <textarea 
                      className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#ff00a0] transition-colors h-24"
                      value={taskForm.notes}
                      onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                      placeholder="Operational details, specifications, etc."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Inject Checklist (One per line)</label>
                    <textarea 
                      className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#ff00a0] transition-colors h-28 font-mono"
                      value={taskForm.checklistText}
                      onChange={(e) => setTaskForm({ ...taskForm, checklistText: e.target.value })}
                      placeholder="Draft chapter 1&#10;Process literature base&#10;Synthesize results"
                    ></textarea>
                  </div>

                  <button type="submit" className="w-full bg-gradient-to-r from-[#1f0b2a] to-[#0b0410] text-[#ff00a0] border border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-[#060309] hover:border-[#ff00a0] transition-all duration-300 font-bold uppercase py-3 rounded-xl font-mono tracking-wider">
                    Add To Queue
                  </button>
                </form>
              </div>

              {/* Backlog Systems Output list */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
                <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide">
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

                      return (
                        <div key={t.id} className={`bg-[#0c0712] border rounded-xl p-5 relative transition-all duration-300 ${t.isCompleted ? 'border-white/5 opacity-60' : 'border-[#ff00a0]/15 hover:border-[#ff00a0]/40'}`}>
                          <div className="flex justify-between items-start mb-2 gap-4">
                            <div>
                              <h4 className="text-sm font-extrabold text-white uppercase tracking-wide">{t.name}</h4>
                              <p className="text-[10px] font-mono text-[#7b7f9e] mt-0.5">
                                Deadline: {formatToSwissDate(t.dueDate)} | Target Buffer: {formatToSwissDate(t.targetDate)}
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
                                <span className="text-[#ff00a0] font-bold">{completedCount}/{totalCount} DONE</span>
                              </div>
                              <div className="w-full bg-[#1a0f26] h-1 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-[#d946ef] to-[#ff00a0] h-full" style={{ width: `${progressPct}%` }}></div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                                {t.checklist.map(item => (
                                  <label key={item.id} className="flex items-center gap-2 bg-[#120b1c]/40 p-2 rounded-lg border border-white/5 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="accent-[#ff00a0]" 
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
              <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-6">
                Milestone Capacity Loading Curve (14-Day Horizon)
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-7 lg:grid-cols-14 gap-3">
                {Array.from({ length: 14 }).map((_, idx) => {
                  const targetDateObj = new Date();
                  targetDateObj.setDate(targetDateObj.getDate() + idx);
                  const formattedDateStr = targetDateObj.toISOString().split('T')[0];
                  const milestonesValue = getDistributedMilestonesCount(formattedDateStr);
                  
                  // Scale logic height limits
                  const fillHeight = Math.min(100, (milestonesValue / 5) * 100);

                  return (
                    <div key={idx} className="bg-[#0c0712] border border-[#ff00a0]/10 rounded-xl p-3 flex flex-col justify-between items-center text-center">
                      <span className="text-[10px] font-mono text-[#7b7f9e]">
                        {targetDateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      
                      <div className="w-4 bg-[#1a0f26] h-24 rounded-full my-2 relative overflow-hidden border border-[#ff00a0]/5 flex items-end">
                        <div 
                          className="w-full bg-gradient-to-t from-[#d946ef] to-[#ff00a0] rounded-full transition-all duration-500" 
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
              <Utensils className="w-16 h-16 text-[#ff00a0] mx-auto drop-shadow-[0_0_15px_rgba(255,0,160,0.5)]" />
              <div>
                <h2 className="text-2xl font-extrabold text-[#ff00a0] tracking-wider uppercase">Nutrition Matrix Portal</h2>
                <p className="text-xs font-mono text-[#7b7f9e] mt-1">LOCK DOWN REAGENTS AND FUEL PATHWAY ALLOCATIONS</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <button 
                  onClick={() => setCurrentPage('View Cookbook')}
                  className="bg-[#0c0712] border border-[#ff00a0]/30 hover:border-[#ff00a0] text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:shadow-[0_0_15px_rgba(255,0,160,0.2)] transition-all"
                >
                  <BookOpen className="w-6 h-6 text-[#ff00a0]" />
                  <span className="text-xs uppercase font-mono font-bold tracking-wide">My Recipes</span>
                </button>

                <button 
                  onClick={() => setCurrentPage('Add Recipe')}
                  className="bg-[#0c0712] border border-[#ff00a0]/30 hover:border-[#ff00a0] text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:shadow-[0_0_15px_rgba(255,0,160,0.2)] transition-all"
                >
                  <Plus className="w-6 h-6 text-[#ff00a0]" />
                  <span className="text-xs uppercase font-mono font-bold tracking-wide">Add Blueprint</span>
                </button>

                <button 
                  onClick={() => setCurrentPage('Weekly Meal Planner')}
                  className="bg-[#0c0712] border border-[#ff00a0]/30 hover:border-[#ff00a0] text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:shadow-[0_0_15px_rgba(255,0,160,0.2)] transition-all"
                >
                  <Calendar className="w-6 h-6 text-[#ff00a0]" />
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
              <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide">Synthesize Recipe Map</h3>
              <button onClick={() => setCurrentPage('Recipe Dashboard')} className="text-xs font-mono text-[#7b7f9e] hover:text-white uppercase">Cancel</button>
            </div>

            <form onSubmit={handleCreateRecipe} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Designation ID (Name)</label>
                <input 
                  type="text" 
                  className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#ff00a0] transition-colors"
                  value={recipeForm.name}
                  onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
                  placeholder="e.g. Anabolic Rice Bowl"
                  required
                />
              </div>

              <div>
                <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Matrix Vector Classification</label>
                <select 
                  className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-[#ff00a0] rounded-xl p-3 focus:outline-none focus:border-[#ff00a0] transition-colors font-mono"
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
                  className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#ff00a0] transition-colors h-28 font-mono"
                  value={recipeForm.ingredientsText}
                  onChange={(e) => setRecipeForm({ ...recipeForm, ingredientsText: e.target.value })}
                  placeholder="200g Lean Ground Beef&#10;100g Rice Jasmine&#10;50g Avocado"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Synthesizing Protocol (Instructions)</label>
                <textarea 
                  className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#ff00a0] transition-colors h-32"
                  value={recipeForm.instructions}
                  onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })}
                  placeholder="Boil rice. Grill ground beef with spices. Top with sliced avocado."
                  required
                ></textarea>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-[#1f0b2a] to-[#0b0410] text-[#ff00a0] border border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-[#060309] hover:border-[#ff00a0] transition-all duration-300 font-bold uppercase py-3 rounded-xl font-mono tracking-wider">
                Write To Cookbook Registry
              </button>
            </form>
          </div>
        )}

        {/* SUB-SCREEN: VIEW COOKBOOK */}
        {currentPage === 'View Cookbook' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide">My Recipes Database</h3>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage('Recipe Dashboard')} className="bg-[#1f0b2a]/40 text-[#ff00a0] border border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-black hover:border-[#ff00a0] transition-all text-xs font-bold font-mono uppercase px-4 py-2 rounded-full">Menu</button>
                <button onClick={() => setCurrentPage('Add Recipe')} className="bg-[#ff00a0] text-black text-xs font-bold font-mono uppercase px-4 py-2 rounded-full shadow-lg hover:shadow-[0_0_15px_rgba(255,0,160,0.4)] transition-all">Add New Recipe</button>
              </div>
            </div>

            <div className="flex gap-2 border-b border-white/5 pb-4">
              {['', 'Breakfast', 'Meal', 'Snack', 'Dessert'].map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedRecipeFilter(cat)}
                  className={`text-xs font-mono font-bold uppercase px-3 py-1.5 rounded-full border transition-all ${
                    selectedRecipeFilter === cat 
                      ? 'bg-[#d946ef] text-black border-[#d946ef]' 
                      : 'bg-[#120b1c]/60 text-[#a3a8cc] border-white/5 hover:border-[#ff00a0]/30'
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
                          onClick={() => {
                            const updated = recipes.filter(r => r.id !== recipe.id);
                            setRecipes(updated);
                            saveToStorage('summit_recipes', updated);
                          }}
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
              <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide">Weekly Rotational Scheduler</h3>
              <button onClick={() => setCurrentPage('Recipe Dashboard')} className="bg-[#1f0b2a]/40 text-[#ff00a0] border border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-black hover:border-[#ff00a0] transition-all text-xs font-bold font-mono uppercase px-4 py-2 rounded-full">Menu</button>
            </div>

            {/* Weekly Planner Setup Grid */}
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
                            className="w-full bg-[#0c0712] border border-[#ff00a0]/20 text-white rounded-lg p-2 focus:outline-none focus:border-[#ff00a0]"
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
              <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-2 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#ff00a0]" />
                Auto-Generated Procurement List
              </h3>
              <p className="text-[11px] font-mono text-[#7b7f9e] mb-4">INVENTORY CHECKLIST CALCULATED DIRECTLY FROM THE ACTIVE WEEKLY ROTATIONAL MEALS</p>

              {getAutoGeneratedShoppingList().length === 0 ? (
                <p className="text-xs text-[#7b7f9e] italic font-mono">Nutrition maps are clear. Supply levels verified.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getAutoGeneratedShoppingList().map(({ ingredient, count }, idx) => (
                    <label key={idx} className="flex items-center gap-3 bg-[#0c0712] border border-[#ff00a0]/10 hover:border-[#ff00a0]/30 p-3 rounded-xl transition-all cursor-pointer">
                      <input type="checkbox" className="accent-[#ff00a0] w-4 h-4 rounded" />
                      <div className="text-xs font-mono">
                        <span className="text-white font-bold">{ingredient}</span>
                        <span className="text-[#ff00a0] ml-2 font-extrabold">({count}x deployed)</span>
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
            
            {/* Live Performance Telemetry Grid Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-5 shadow-xl backdrop-blur-md text-center">
                <span className="text-xs uppercase font-mono text-[#a3a8cc] tracking-wider block">Cumulative Lifts Volume</span>
                <span className="text-3xl font-extrabold text-white block my-2">
                  {getTotalKineticVolume().toLocaleString()} KG
                </span>
                <span className="text-[10px] text-[#ff00a0] font-mono uppercase">Force Matrix Unlocked</span>
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
              
              {/* Creator Matrix & Tools */}
              <div className="space-y-6">
                
                {/* Physical Template Builder Panel */}
                <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-4">
                    Workout Blueprint Constructor
                  </h3>
                  
                  <form onSubmit={handleCreateWorkoutTemplate} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Routine Designation ID (Name)</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#ff00a0]"
                        value={workoutTemplateForm.name}
                        onChange={(e) => setWorkoutTemplateForm({ ...workoutTemplateForm, name: e.target.value })}
                        placeholder="e.g. Back and Biceps Destructor"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Log Exercises (One per line)</label>
                      <textarea 
                        className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-3 focus:outline-none focus:border-[#ff00a0] h-24 font-mono"
                        value={workoutTemplateForm.exercisesText}
                        onChange={(e) => setWorkoutTemplateForm({ ...workoutTemplateForm, exercisesText: e.target.value })}
                        placeholder="Weighted pullups&#10;Barbell Rows&#10;Incline Dumbbell Curls"
                        required
                      ></textarea>
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-[#1f0b2a] to-[#0b0410] text-[#ff00a0] border border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-[#060309] hover:border-[#ff00a0] transition-all duration-300 font-bold uppercase py-2.5 rounded-xl font-mono tracking-wider">
                      Write Blueprint Frame
                    </button>
                  </form>

                  <div className="mt-6 space-y-3">
                    <span className="text-[10px] uppercase font-mono text-[#7b7f9e] block">Stored Blueprints</span>
                    {workoutTemplates.map(t => (
                      <div key={t.id} className="bg-[#0c0712] border border-white/5 p-3 rounded-xl flex justify-between items-center">
                        <div>
                          <strong className="text-xs text-white uppercase block">{t.name}</strong>
                          <span className="text-[10px] font-mono text-[#7b7f9e]">{t.exercises.join(', ')}</span>
                        </div>
                        <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-full transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Training Rotational Scheduler */}
                <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-4">
                    Weekly Rotational Training Plan
                  </h3>
                  <div className="space-y-3 text-xs">
                    {daysOfWeek.map(day => (
                      <div key={day} className="flex justify-between items-center bg-[#0c0712] border border-[#ff00a0]/10 p-2.5 rounded-xl">
                        <span className="font-mono text-white text-[11px] font-bold uppercase">{day}</span>
                        <select 
                          className="bg-[#120b1c] border border-[#ff00a0]/20 text-[#ff00a0] rounded px-2 py-1 text-xs focus:outline-none"
                          value={weeklyWorkoutPlan[day] || 'Rest Day'}
                          onChange={(e) => handleUpdateWeeklyWorkout(day, e.target.value)}
                        >
                          <option value="Rest Day">Rest Day</option>
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
                  <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-4">
                    Log Aerobic Session
                  </h3>
                  <form onSubmit={handleLogManualCardio} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[#a3a8cc] uppercase font-mono mb-1">Module type</label>
                        <select 
                          className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-[#ff00a0] rounded-xl p-2.5 focus:outline-none"
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
                          className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-2.5 focus:outline-none"
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
                          className="w-full bg-[#0c0712] border border-[#ff00a0]/25 text-white rounded-xl p-2.5 focus:outline-none"
                          value={cardioForm.distance}
                          onChange={(e) => setCardioForm({ ...cardioForm, distance: e.target.value })}
                          min="0"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-[#1f0b2a] to-[#0b0410] text-[#ff00a0] border border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-[#060309] hover:border-[#ff00a0] transition-all duration-300 font-bold uppercase py-2.5 rounded-xl font-mono tracking-wider">
                      Write Cardio Telemetry
                    </button>
                  </form>
                </div>

                {/* Training Chronological Databases */}
                <div className="bg-[#120b1c]/80 border border-[#d946ef]/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wide mb-4">
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
                                <span className="text-[#ff00a0] font-bold block">{log.activity.toUpperCase()}</span>
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