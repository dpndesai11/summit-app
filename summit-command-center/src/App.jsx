import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, CheckSquare, Utensils, Dumbbell, 
  Plus, Trash2, Calendar, ArrowLeft, ChevronRight, ShoppingCart, BarChart3
} from 'lucide-react';

export default function App() {
  // --- STATE PERSISTENCE MECHANICS (localStorage) ---
  const [currentPage, setCurrentPage] = useState('Main Hub');
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('summit_tasks')) || []);
  const [recipes, setRecipes] = useState(() => JSON.parse(localStorage.getItem('summit_recipes')) || []);
  const [mealPlan, setMealPlan] = useState(() => JSON.parse(localStorage.getItem('summit_mealplan')) || {});
  const [strengthLogs, setStrengthLogs] = useState(() => JSON.parse(localStorage.getItem('summit_strength')) || []);
  const [cardioLogs, setCardioLogs] = useState(() => JSON.parse(localStorage.getItem('summit_cardio')) || []);
  const [workoutTemplates, setWorkoutTemplates] = useState(() => JSON.parse(localStorage.getItem('summit_templates')) || []);
  const [weeklyFitnessPlan, setWeeklyFitnessPlan] = useState(() => JSON.parse(localStorage.getItem('summit_fitplan')) || {});

  // Form states
  const [newTask, setNewTask] = useState({ name: '', dueDate: '', targetDate: '', notes: '', checklistText: '' });
  const [newRecipe, setNewRecipe] = useState({ name: '', category: 'Meal', ingredients: '', instructions: '' });
  const [selectedRecipeBlueprint, setSelectedRecipeBlueprint] = useState('');
  const [newTemplate, setNewTemplate] = useState({ name: '', exercisesText: '' });
  const [manualCardio, setManualCardio] = useState({ activity: 'Running', duration: 30, distance: 5.0 });
  const [purgeChoice, setPurgeChoice] = useState('Strength');
  const [purgeId, setPurgeId] = useState('');

  useEffect(() => { localStorage.setItem('summit_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('summit_recipes', JSON.stringify(recipes)); }, [recipes]);
  useEffect(() => { localStorage.setItem('summit_mealplan', JSON.stringify(mealPlan)); }, [mealPlan]);
  useEffect(() => { localStorage.setItem('summit_strength', JSON.stringify(strengthLogs)); }, [strengthLogs]);
  useEffect(() => { localStorage.setItem('summit_cardio', JSON.stringify(cardioLogs)); }, [cardioLogs]);
  useEffect(() => { localStorage.setItem('summit_templates', JSON.stringify(workoutTemplates)); }, [workoutTemplates]);
  useEffect(() => { localStorage.setItem('summit_fitplan', JSON.stringify(weeklyFitnessPlan)); }, [weeklyFitnessPlan]);

  // --- TIME INTERFACE DATA ---
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const mealSlots = ["Breakfast", "Meal 1", "Meal 2", "Snack 1", "Snack 2"];
  const todayDateObj = new Date();
  const todayDay = todayDateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const todaySwissStr = todayDateObj.toLocaleDateString('ch-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // --- COMPUTE PREDICTIVE ALGORITHMS ---
  const calculateVelocity = () => {
    let totalItems = 0; let completedItems = 0;
    tasks.forEach(t => {
      const items = t.checklist || [];
      totalItems += items.length || 1;
      if (t.isCompleted) completedItems += items.length || 1;
      else items.forEach(i => { if (i.isCompleted) completedItems++; });
    });
    return totalItems === 0 ? 1.0 : Math.round((completedItems / totalItems) * 100) / 100;
  };

  const getDistributedMilestonesCount = (targetDateStr) => {
    let count = 0;
    const targetTime = new Date(targetDateStr).setHours(0,0,0,0);
    const todayTime = new Date().setHours(0,0,0,0);
    
    tasks.forEach(task => {
      if (task.isCompleted) return;
      const taskTargetTime = new Date(task.targetDate).setHours(0,0,0,0);
      if (todayTime <= targetTime && targetTime <= taskTargetTime) {
        const totalDays = Math.max(1, Math.round((taskTargetTime - todayTime) / (1000 * 60 * 60 * 24)) + 1);
        const incompleteMilestones = (task.checklist || []).filter(i => !i.isCompleted).length || 1;
        count += Math.round((incompleteMilestones / totalDays) * 10) / 10;
      }
    });
    return Math.round(count * 10) / 10;
  };

  // --- CRITICAL HANDLERS ---
  const handleCreateTask = () => {
    if (!newTask.name || !newTask.targetDate) return;
    const checklistItems = newTask.checklistText.split('\n').filter(l => l.trim()).map((l, idx) => ({
      id: Date.now() + idx, item_name: l.trim(), isCompleted: false
    }));
    const added = {
      id: Date.now(), name: newTask.name, dueDate: newTask.dueDate || newTask.targetDate,
      targetDate: newTask.targetDate, notes: newTask.notes, checklist: checklistItems, isCompleted: false
    };
    setTasks([...tasks, added]);
    setNewTask({ name: '', dueDate: '', targetDate: '', notes: '', checklistText: '' });
  };

  const toggleChecklistItem = (taskId, itemId) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, checklist: t.checklist.map(i => i.id === itemId ? { ...i, isCompleted: !i.isCompleted } : i) };
      }
      return t;
    }));
  };

  const handleCreateRecipe = () => {
    if (!newRecipe.name) return;
    const item = {
      id: Date.now(), name: newRecipe.name, category: newRecipe.category,
      ingredients: newRecipe.ingredients.split('\n').filter(l => l.trim()), instructions: newRecipe.instructions
    };
    setRecipes([...recipes, item]);
    setSelectedRecipeBlueprint(item.name);
    setNewRecipe({ name: '', category: 'Meal', ingredients: '', instructions: '' });
    setCurrentPage('View Cookbook');
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name) return;
    const item = {
      id: Date.now(), name: newTemplate.name,
      exercises: newTemplate.exercisesText.split('\n').filter(l => l.trim())
    };
    setWorkoutTemplates([...workoutTemplates, item]);
    setNewTemplate({ name: '', exercisesText: '' });
  };

  const handleLogStrengthWorkout = (e, exercises, loggedSets) => {
    e.preventDefault();
    const newLogs = exercises.map((ex, idx) => ({
      id: Date.now() + idx, date: todayDateObj.toISOString().split('T')[0],
      exercise: ex, weight: parseFloat(loggedSets[ex]?.weight || 40),
      sets: parseInt(loggedSets[ex]?.sets || 3), reps: parseInt(loggedSets[ex]?.reps || 8)
    }));
    setStrengthLogs([...newLogs, ...strengthLogs]);
    alert("Physical performance telemetry logged to core storage matrix.");
  };

  const handlePurgeLog = () => {
    const idNum = parseInt(purgeId);
    if (!idNum) return;
    if (purgeChoice === 'Strength') setStrengthLogs(strengthLogs.filter(l => l.id !== idNum));
    else setCardioLogs(cardioLogs.filter(l => l.id !== idNum));
    setPurgeId('');
  };

  // Compute total dynamic load parameters
  const totalVolume = strengthLogs.reduce((acc, curr) => acc + (curr.weight * curr.sets * curr.reps), 0);
  const totalCardioMins = cardioLogs.reduce((acc, curr) => acc + curr.duration, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#160a1d] to-[#060309] text-[#a3a8cc] font-sans p-6 selection:bg-[#ff00a0] selection:text-black">
      
      {/* HEADER HUD BAR */}
      <div className="border-l-4 border-[#ff00a0] pl-4 mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-[#ff00a0] uppercase drop-shadow-[0_0_15px_rgba(255,0,160,0.45)]">
            Summit Command Center
          </h1>
          <p className="text-xs font-semibold tracking-widest text-[#7b7f9e] uppercase mt-1">
            Core Interface Matrix // System Modules Online
          </p>
        </div>
        <div className="text-right text-xs uppercase tracking-wider text-[#d946ef]">
          <div>REF: <span className="font-bold">{todayDay}</span></div>
          <div>STAMP: {todaySwissStr}</div>
        </div>
      </div>

      {/* CORE CONTROL NAV DESK */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button onClick={() => setCurrentPage('Main Hub')} className={`p-3 text-xs font-bold uppercase tracking-widest rounded-xl transition duration-300 border flex items-center justify-center gap-2 ${currentPage === 'Main Hub' ? 'bg-[#ff00a0] text-black border-[#ff00a0] shadow-[0_0_15px_rgba(255,0,160,0.5)]' : 'bg-[#1f0b2a] text-[#ff00a0] border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-black'}`}>
          <LayoutDashboard size={14} /> Main Hub
        </button>
        <button onClick={() => setCurrentPage('Task Dashboard')} className={`p-3 text-xs font-bold uppercase tracking-widest rounded-xl transition duration-300 border flex items-center justify-center gap-2 ${currentPage === 'Task Dashboard' ? 'bg-[#ff00a0] text-black border-[#ff00a0] shadow-[0_0_15px_rgba(255,0,160,0.5)]' : 'bg-[#1f0b2a] text-[#ff00a0] border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-black'}`}>
          <CheckSquare size={14} /> Task Distributor
        </button>
        <button onClick={() => setCurrentPage('Recipe Dashboard')} className={`p-3 text-xs font-bold uppercase tracking-widest rounded-xl transition duration-300 border flex items-center justify-center gap-2 ${currentPage.includes('Recipe') || currentPage.includes('Cookbook') || currentPage.includes('Meal Planner') ? 'bg-[#ff00a0] text-black border-[#ff00a0] shadow-[0_0_15px_rgba(255,0,160,0.5)]' : 'bg-[#1f0b2a] text-[#ff00a0] border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-black'}`}>
          <Utensils size={14} /> Nutrition Planner
        </button>
        <button onClick={() => setCurrentPage('Fitness Dashboard')} className={`p-3 text-xs font-bold uppercase tracking-widest rounded-xl transition duration-300 border flex items-center justify-center gap-2 ${currentPage === 'Fitness Dashboard' ? 'bg-[#ff00a0] text-black border-[#ff00a0] shadow-[0_0_15px_rgba(255,0,160,0.5)]' : 'bg-[#1f0b2a] text-[#ff00a0] border-[#ff00a0]/30 hover:bg-[#ff00a0] hover:text-black'}`}>
          <Dumbbell size={14} /> Fitness Deck
        </button>
      </div>

      <hr className="border-t border-[#ff00a0]/15 mb-8" />

      {/* ==================== MAIN HUB VIEW ==================== */}
      {currentPage === 'Main Hub' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[#120b1c]/80 border border-[#d946ef]/25 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-extrabold text-[#ff00a0] tracking-wider mb-4 uppercase">Today's Fuel Allocations</h3>
              <div className="space-y-2 text-sm">
                {mealSlots.map(slot => {
                  const assigned = mealPlan[`${todayDay}_${slot}`] || 'None';
                  return assigned !== 'None' ? (
                    <div key={slot} className="flex justify-between border-b border-white/5 py-2">
                      <span className="text-white font-medium">{slot}:</span>
                      <span className="text-[#d946ef] bg-[#1a0f26] border border-[#ff00a0]/25 px-2 py-0.5 rounded text-xs">{assigned}</span>
                    </div>
                  ) : null;
                })}
                {!mealSlots.some(s => (mealPlan[`${todayDay}_${s}`] || 'None') !== 'None') && (
                  <p className="text-xs text-[#7b7f9e] italic">No nutrition maps assigned for this timeline operational window.</p>
                )}
              </div>
            </div>

            <div className="bg-[#120b1c]/80 border border-[#d946ef]/25 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-extrabold text-[#ff00a0] tracking-wider mb-4 uppercase">Physical Array Routine Active</h3>
              {(() => {
                const activeTemplateName = weeklyFitnessPlan[todayDay] || 'None';
                if (activeTemplateName === 'None' || activeTemplateName === 'Rest Day') {
                  return <p className="text-xs text-[#7b7f9e] italic">System Idle: Active structural rest period assigned for today.</p>;
                }
                const activeTemplate = workoutTemplates.find(t => t.name === activeTemplateName);
                if (!activeTemplate || !activeTemplate.exercises.length) {
                  return <p className="text-xs text-yellow-400">Physical Matrix active ({activeTemplateName}), but no exercise arrays mapped to template.</p>;
                }

                // Temporary states inside standard dynamic components maps
                return (
                  <form onSubmit={(e) => {
                    const data = {};
                    activeTemplate.exercises.forEach(ex => {
                      data[ex] = {
                        weight: e.target[`w_${ex}`].value,
                        sets: e.target[`s_${ex}`].value,
                        reps: e.target[`r_${ex}`].value
                      };
                    });
                    handleLogStrengthWorkout(e, activeTemplate.exercises, data);
                  }} className="space-y-4">
                    <span className="text-xs font-bold uppercase px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">ACTIVE MODULE: {activeTemplateName}</span>
                    <div className="space-y-3 pt-2">
                      {activeTemplate.exercises.map((ex, i) => (
                        <div key={i} className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-2">
                          <div className="text-xs uppercase font-bold text-white">{ex}</div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-[#7b7f9e] uppercase">Mass (KG)</label>
                              <input name={`w_${ex}`} type="number" defaultValue="40" className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded p-1 text-xs text-[#ff00a0]" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#7b7f9e] uppercase">Sets</label>
                              <input name={`s_${ex}`} type="number" defaultValue="3" className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded p-1 text-xs text-[#ff00a0]" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#7b7f9e] uppercase">Reps</label>
                              <input name={`r_${ex}`} type="number" defaultValue="8" className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded p-1 text-xs text-[#ff00a0]" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="submit" className="w-full bg-[#1f0b2a] text-xs font-bold uppercase border border-[#ff00a0]/30 text-[#ff00a0] py-2.5 rounded-xl hover:bg-[#ff00a0] hover:text-black transition">
                      Complete Workout and Log Performance
                    </button>
                  </form>
                );
              })()}
            </div>

            <div className="bg-[#120b1c]/80 border border-[#d946ef]/25 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-extrabold text-[#ff00a0] tracking-wider mb-4 uppercase">Milestone Target Chunks (Today)</h3>
              <div className="space-y-4">
                {tasks.filter(t => !t.isCompleted).map(task => {
                  const dayAlloc = getDistributedMilestonesCount(new Date().toISOString().split('T')[0]);
                  if (dayAlloc === 0) return null;
                  return (
                    <div key={task.id} className="border border-[#ff00a0]/25 rounded-xl p-4 bg-[#1a0f26]/50">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wide">{task.name}</h4>
                        <span className="text-xs text-[#d946ef] bg-black px-2 py-0.5 border border-white/5 rounded">Due: {task.dueDate}</span>
                      </div>
                      {task.notes && <p className="text-xs text-[#7b7f9e] bg-black/30 p-2 rounded mb-3 border-l border-[#ff00a0]/30">{task.notes}</p>}
                      <div className="space-y-2">
                        {task.checklist.map(item => (
                          <label key={item.id} className="flex items-center gap-3 text-xs text-white/90 cursor-pointer hover:text-white">
                            <input type="checkbox" checked={item.isCompleted} onChange={() => toggleChecklistItem(task.id, item.id)} className="rounded accent-[#ff00a0] bg-black border-white/20" />
                            <span className={item.isCompleted ? 'line-through text-[#7b7f9e]' : ''}>{item.item_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR PREDICTIVE CALENDAR */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-[#d946ef] tracking-widest uppercase mb-2">Upcoming Schedule Horizonal Track</h3>
            {[1, 2, 3].map(offset => {
              const futDate = new Date(); futDate.setDate(todayDateObj.getDate() + offset);
              const futDay = futDate.toLocaleDateString('en-US', { weekday: 'long' });
              const dayStr = futDate.toISOString().split('T')[0];
              const workout = weeklyFitnessPlan[futDay] || "Rest Day";
              const taskLoads = getDistributedMilestonesCount(dayStr);
              return (
                <div key={offset} className="bg-[#120b1c]/80 border border-[#ff00a0]/20 rounded-xl p-4 shadow-lg space-y-2">
                  <h4 className="text-xs font-extrabold text-[#ff00a0] tracking-wider">{futDay.toUpperCase()} ({futDate.toLocaleDateString('ch-FR', {day:'2-digit', month:'2-digit'})})</h4>
                  <div className="text-xs space-y-1">
                    <p><span className="text-[#7b7f9e]">Workout:</span> <span className="text-white font-medium">{workout}</span></p>
                    <p><span className="text-[#7b7f9e]">Predictive Task Load:</span> <span className="text-[#d946ef] font-medium">{taskLoads} milestones allocated</span></p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TASK DISTRIBUTOR VIEW ==================== */}
      {currentPage === 'Task Dashboard' && (
        <div className="space-y-8">
          {/* TOP METRICS HUD GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#120b1c]/70 border border-[#ff00a0]/20 p-4 rounded-xl shadow-md">
              <div className="text-[10px] uppercase tracking-widest text-[#7b7f9e]">Historical Milestone Velocity</div>
              <div className="text-2xl font-black text-white mt-1">{Math.round(calculateVelocity() * 100)}%</div>
              <div className="text-[10px] text-green-400 mt-1">Engine Running Optimal</div>
            </div>
            <div className="bg-[#120b1c]/70 border border-[#ff00a0]/20 p-4 rounded-xl shadow-md">
              <div className="text-[10px] uppercase tracking-widest text-[#7b7f9e]">Milestones Scheduled Today</div>
              <div className="text-2xl font-black text-white mt-1">{getDistributedMilestonesCount(new Date().toISOString().split('T')[0])} Chunks</div>
            </div>
            <div className="bg-[#120b1c]/70 border border-[#ff00a0]/20 p-4 rounded-xl shadow-md">
              <div className="text-[10px] uppercase tracking-widest text-[#7b7f9e]">Active Backlog Horizons</div>
              <div className="text-2xl font-black text-white mt-1">{tasks.filter(t => !t.isCompleted).length} Nodes Active</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* COMPILER CREATE FORM */}
            <div className="bg-[#120b1c]/80 border border-[#d946ef]/25 p-6 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-md font-extrabold text-[#ff00a0] tracking-wider uppercase">Compile New Operational Project</h3>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#7b7f9e] mb-1">Task Designation Name</label>
                <input type="text" value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-sm text-[#ff00a0] focus:outline-none focus:border-[#ff00a0]" placeholder="System Operation Code Alpha" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#7b7f9e] mb-1">Hard Milestone Deadline</label>
                  <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-sm text-[#ff00a0]" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#7b7f9e] mb-1">Soft Buffer Target Date</label>
                  <input type="date" value={newTask.targetDate} onChange={e => setNewTask({...newTask, targetDate: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-sm text-[#ff00a0]" />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#7b7f9e] mb-1">Vector Specifications (Details)</label>
                <textarea rows="2" value={newTask.notes} onChange={e => setNewTask({...newTask, notes: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-sm text-[#ff00a0]"></textarea>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#7b7f9e] mb-1">Inject Checklist Milestones (One directive per line)</label>
                <textarea rows="3" value={newTask.checklistText} onChange={e => setNewTask({...newTask, checklistText: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-sm font-mono text-[#ff00a0]" placeholder="Sub-Task Step 1&#10;Sub-Task Step 2"></textarea>
              </div>
              <button onClick={handleCreateTask} className="w-full bg-[#1f0b2a] text-xs font-bold uppercase tracking-wider border border-[#ff00a0]/30 text-[#ff00a0] p-3 rounded-xl hover:bg-[#ff00a0] hover:text-black transition">
                Add Project to Active Matrix Queue
              </button>
            </div>

            {/* LIST ACTIVE PACKETS */}
            <div className="space-y-4">
              <h3 className="text-md font-extrabold text-[#d946ef] tracking-wider uppercase">System Backlog and Active Runtimes</h3>
              {tasks.filter(t => !t.isCompleted).map(task => {
                const completedCount = task.checklist.filter(c => c.isCompleted).length;
                const totalCount = task.checklist.length || 1;
                const pct = (completedCount / totalCount) * 100;
                return (
                  <div key={task.id} className="bg-[#120b1c]/80 border border-[#ff00a0]/20 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-white uppercase text-sm">{task.name}</div>
                      <div className="flex gap-2">
                        <button onClick={() => setTasks(tasks.map(t => t.id === task.id ? {...t, isCompleted: true} : t))} className="p-1 px-2 text-[10px] uppercase font-bold border border-green-500/30 text-green-400 bg-green-500/5 hover:bg-green-500 hover:text-black rounded">Complete</button>
                        <button onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} className="text-red-400 border border-red-500/30 p-1 rounded hover:bg-red-500/20"><Trash2 size={12}/></button>
                      </div>
                    </div>
                    <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                      <div className="bg-gradient-to-r from-[#ff00a0] to-[#d946ef] h-full transition-all" style={{width: `${pct}%`}}></div>
                    </div>
                    <div className="text-[10px] text-[#7b7f9e] flex justify-between">
                      <span>METRIC RATIO: {completedCount}/{totalCount} COMPLETE</span>
                      <span>TARGET: {task.targetDate}</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {task.checklist.map(item => (
                        <label key={item.id} className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                          <input type="checkbox" checked={item.isCompleted} onChange={() => toggleChecklistItem(task.id, item.id)} className="rounded accent-[#ff00a0] bg-black border-white/20" />
                          <span className={item.isCompleted ? 'line-through text-[#7b7f9e]' : ''}>{item.item_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== NUTRITION / RECIPE SUB-SYSTEM ==================== */}
      {currentPage === 'Recipe Dashboard' && (
        <div className="bg-[#120b1c]/80 border border-[#d946ef]/25 p-8 rounded-2xl shadow-xl max-w-2xl mx-auto space-y-6 text-center">
          <h3 className="text-xl font-extrabold text-[#ff00a0] tracking-widest uppercase">Nutrition Interface Hub</h3>
          <div className="grid grid-cols-1 gap-4 pt-4">
            <button onClick={() => setCurrentPage('View Cookbook')} className="p-4 bg-black/40 border border-[#ff00a0]/20 rounded-xl hover:border-[#ff00a0] text-xs font-bold uppercase tracking-widest text-white transition">View Structural Cookbook</button>
            <button onClick={() => setCurrentPage('Add a Recipe')} className="p-4 bg-black/40 border border-[#ff00a0]/20 rounded-xl hover:border-[#ff00a0] text-xs font-bold uppercase tracking-widest text-white transition">Encode Blueprint Recipe Entry</button>
            <button onClick={() => setCurrentPage('Weekly Meal Planner')} className="p-4 bg-black/40 border border-[#ff00a0]/20 rounded-xl hover:border-[#ff00a0] text-xs font-bold uppercase tracking-widest text-white transition">Open Chronological Meal Scheduler</button>
          </div>
        </div>
      )}

      {currentPage === 'Add a Recipe' && (
        <div className="max-w-xl mx-auto bg-[#120b1c]/80 border border-[#d946ef]/25 p-6 rounded-2xl space-y-4">
          <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wider">Create Recipe Schema Blueprint</h3>
          <div>
            <label className="block text-xs uppercase text-[#7b7f9e] mb-1">Blueprint Identity ID (Recipe Name)</label>
            <input type="text" value={newRecipe.name} onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-sm text-[#ff00a0]" />
          </div>
          <div>
            <label className="block text-xs uppercase text-[#7b7f9e] mb-1">Resource Vector Category</label>
            <select value={newRecipe.category} onChange={e => setNewRecipe({...newRecipe, category: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-sm text-[#ff00a0]">
              <option>Breakfast</option><option>Meal</option><option>Snacks</option><option>Desserts</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase text-[#7b7f9e] mb-1">Component Inventory (One item per line)</label>
            <textarea rows="4" value={newRecipe.ingredients} onChange={e => setNewRecipe({...newRecipe, ingredients: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-sm font-mono text-[#ff00a0]" placeholder="Ingredient A&#10;Ingredient B"></textarea>
          </div>
          <div>
            <label className="block text-xs uppercase text-[#7b7f9e] mb-1">Synthesis Protocols (Instructions)</label>
            <textarea rows="4" value={newRecipe.instructions} onChange={e => setNewRecipe({...newRecipe, instructions: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-sm text-[#ff00a0]"></textarea>
          </div>
          <button onClick={handleCreateRecipe} className="w-full bg-[#ff00a0] text-black font-bold uppercase text-xs p-3 rounded-xl tracking-wider">Save Architecture Record to Cookbook</button>
        </div>
      )}

      {currentPage === 'View Cookbook' && (
        <div className="max-w-2xl mx-auto bg-[#120b1c]/80 border border-[#d946ef]/25 p-6 rounded-2xl space-y-6">
          <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wider">Inspect Blueprint Models</h3>
          <select value={selectedRecipeBlueprint} onChange={e => setSelectedRecipeBlueprint(e.target.value)} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-sm text-[#ff00a0]">
            <option value="">-- Choose Data Node --</option>
            {recipes.map(r => <option key={r.id} value={r.name}>{r.name.toUpperCase()}</option>)}
          </select>

          {(() => {
            const blueprint = recipes.find(r => r.name === selectedRecipeBlueprint);
            if (!blueprint) return <p className="text-xs text-[#7b7f9e] italic">Select a registered recipe profile loop above to inspect vectors.</p>;
            return (
              <div className="border border-white/5 p-4 rounded-xl space-y-4 bg-black/30">
                <div className="text-lg font-black text-white">{blueprint.name.toUpperCase()} <span className="text-xs font-semibold text-[#d946ef] block mt-1">SEGMENT: {blueprint.category.toUpperCase()}</span></div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#ff00a0] uppercase tracking-wider mb-1">Reagents List</h4>
                  <ul className="list-disc pl-4 text-xs space-y-1 text-white/90">{blueprint.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}</ul>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#ff00a0] uppercase tracking-wider mb-1">Construct Process Protocol</h4>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed text-white/80">{blueprint.instructions}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {currentPage === 'Weekly Meal Planner' && (
        <div className="space-y-8">
          <div className="bg-[#120b1c]/80 border border-[#ff00a0]/20 p-6 rounded-2xl shadow-xl">
            <h3 className="text-md font-extrabold text-[#ff00a0] uppercase tracking-widest mb-4">Chronological Deployment Matrix</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {daysOfWeek.map(day => (
                <div key={day} className="bg-black/30 border border-white/5 p-3 rounded-xl space-y-3">
                  <div className="text-xs font-black text-[#d946ef] border-b border-white/5 pb-1 uppercase">{day}</div>
                  {mealSlots.map(slot => (
                    <div key={slot} className="space-y-0.5">
                      <label className="text-[9px] text-[#7b7f9e] uppercase block">{slot}</label>
                      <select value={mealPlan[`${day}_${slot}`] || 'None'} onChange={e => setMealPlan({...mealPlan, [`${day}_${slot}`]: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/15 rounded p-1 text-[11px] text-[#ff00a0]">
                        <option>None</option><option>Flight</option>
                        {recipes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* DYNAMIC SHOPPING PROCUREMENT LIST */}
          <div className="bg-[#120b1c]/80 border border-[#d946ef]/25 p-6 rounded-2xl shadow-xl">
            <h3 className="text-md font-bold text-[#ff00a0] uppercase tracking-wider mb-2 flex items-center gap-2"><ShoppingCart size={16}/> Auto-Generated Shopping List Procurement</h3>
            <p className="text-xs text-[#7b7f9e] mb-4">Dynamic checklist parsing component items mapped inside rotation schedules:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(() => {
                const mapCount = {};
                Object.entries(mealPlan).forEach(([key, val]) => {
                  if (val === 'None' || val === 'Flight') return;
                  const found = recipes.find(r => r.name === val);
                  if (found) {
                    found.ingredients.forEach(ing => {
                      mapCount[ing] = (mapCount[ing] || 0) + 1;
                    });
                  }
                });
                const items = Object.entries(mapCount);
                if (!items.length) return <p className="text-xs italic text-[#7b7f9e] col-span-3">System idle: map cookbook profiles inside scheduler to load requirements.</p>;
                return items.map(([name, count]) => (
                  <label key={name} className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5 text-xs text-white cursor-pointer select-none">
                    <input type="checkbox" className="rounded accent-[#ff00a0] bg-black border-white/20" />
                    <div><span className="font-bold">{name}</span> <span className="text-[10px] text-[#d946ef] block">Deployed {count}x across matrix</span></div>
                  </label>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================== GYM FITNESS ENGINE VIEW ==================== */}
      {currentPage === 'Fitness Dashboard' && (
        <div className="space-y-8">
          {/* VITAL STATISTICS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#120b1c]/70 border border-[#ff00a0]/20 p-4 rounded-xl shadow-md">
              <div className="text-[10px] uppercase tracking-widest text-[#7b7f9e]">Cumulative Kinetic Mass Volume</div>
              <div className="text-2xl font-black text-white mt-1">{totalVolume.toLocaleString()} KG</div>
              <div className="text-[10px] text-green-400 mt-1">Force Matrix Stable</div>
            </div>
            <div className="bg-[#120b1c]/70 border border-[#ff00a0]/20 p-4 rounded-xl shadow-md">
              <div className="text-[10px] uppercase tracking-widest text-[#7b7f9e]">Aerobic Output Runtime</div>
              <div className="text-2xl font-black text-white mt-1">{totalCardioMins} MINS</div>
              <div className="text-[10px] text-[#d946ef] mt-1">Mitochondrial Load Active</div>
            </div>
            <div className="bg-[#120b1c]/70 border border-[#ff00a0]/20 p-4 rounded-xl shadow-md">
              <div className="text-[10px] uppercase tracking-widest text-[#7b7f9e]">Verified Bio-Telemetry Packets</div>
              <div className="text-2xl font-black text-white mt-1">{strengthLogs.length + cardioLogs.length} Records</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* SUB MOD 1: TEMPLATE BUILDER */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/25 p-5 rounded-2xl space-y-4">
                <h4 className="text-sm font-black text-[#ff00a0] uppercase tracking-widest">Structural Blueprint Routine Constructor</h4>
                <div>
                  <label className="block text-xs uppercase text-[#7b7f9e] mb-1">Routine Designation Profile ID</label>
                  <input type="text" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-xs text-[#ff00a0]" placeholder="Lower Deck Hypertrophy Alpha" />
                </div>
                <div>
                  <label className="block text-xs uppercase text-[#7b7f9e] mb-1">Exercises Array Chain Sequence (One per line)</label>
                  <textarea rows="3" value={newTemplate.exercisesText} onChange={e => setNewTemplate({...newTemplate, exercisesText: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded-lg p-2 text-xs font-mono text-[#ff00a0]" placeholder="Barbell Squats&#10;Leg Press"></textarea>
                </div>
                <button onClick={handleCreateTemplate} className="w-full bg-[#1f0b2a] text-[11px] font-bold uppercase tracking-wider border border-[#ff00a0]/30 text-[#ff00a0] py-2 rounded-xl">Encode Blueprint Array</button>
                
                <div className="space-y-2 pt-2">
                  {workoutTemplates.map(tmpl => (
                    <div key={tmpl.id} className="flex justify-between items-center text-xs bg-black/40 p-2 rounded border border-white/5">
                      <div><span className="text-white font-bold">{tmpl.name.toUpperCase()}</span> <span className="text-[10px] text-[#7b7f9e] block">Elements: {tmpl.exercises.join(', ')}</span></div>
                      <button onClick={() => setWorkoutTemplates(workoutTemplates.filter(t => t.id !== tmpl.id))} className="text-red-400 p-1 hover:bg-red-500/20 rounded"><Trash2 size={12}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SUB MOD 2: WEEKLY SCHEDULER MATRIX */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/25 p-5 rounded-2xl space-y-3">
                <h4 className="text-sm font-black text-[#ff00a0] uppercase tracking-widest">Chrono-Rotational Fitness Matrix</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {daysOfWeek.map(day => (
                    <div key={day} className="space-y-0.5">
                      <label className="text-[10px] text-[#7b7f9e] uppercase block font-bold">{day}</label>
                      <select value={weeklyFitnessPlan[day] || 'None'} onChange={e => setWeeklyFitnessPlan({...weeklyFitnessPlan, [day]: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded p-1 text-xs text-[#ff00a0]">
                        <option>None</option><option>Rest Day</option>
                        {workoutTemplates.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* SUB MOD 3: MANUAL CARDIO SECTOR ENTRY */}
              <div className="bg-[#120b1c]/80 border border-[#d946ef]/25 p-5 rounded-2xl space-y-3">
                <h4 className="text-sm font-black text-[#ff00a0] uppercase tracking-widest">Log Manual Cardio Deck Session</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-[#7b7f9e] uppercase block">Engine</label>
                    <select value={manualCardio.activity} onChange={e => setManualCardio({...manualCardio, activity: e.target.value})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded p-1 text-xs text-[#ff00a0]">
                      <option>Running</option><option>Cycling</option><option>Swimming</option><option>Rowing Machine</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#7b7f9e] uppercase block">Minutes</label>
                    <input type="number" value={manualCardio.duration} onChange={e => setManualCardio({...manualCardio, duration: parseInt(e.target.value)||0})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded p-1 text-xs text-[#ff00a0]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#7b7f9e] uppercase block">Range (KM)</label>
                    <input type="number" step="0.1" value={manualCardio.distance} onChange={e => setNewTemplate({...manualCardio, distance: parseFloat(e.target.value)||0})} className="w-full bg-[#0c0712] border border-[#ff00a0]/25 rounded p-1 text-xs text-[#ff00a0]" />
                  </div>
                </div>
                <button onClick={() => {
                  setCardioLogs([{ id: Date.now(), date: new Date().toISOString().split('T')[0], ...manualCardio }, ...cardioLogs]);
                  alert("Telemetry transmission finalized.");
                }} className="w-full bg-[#ff00a0] text-black font-bold text-xs uppercase py-2 rounded-xl">Broadcast Cardio Telemetry</button>
              </div>
            </div>

            {/* CHRONOLOGICAL HISTORICAL FEEDBACK VIEWPORTS */}
            <div className="space-y-4">
              <h3 className="text-md font-extrabold text-[#d946ef] tracking-wider uppercase">Chronological Telemetry Repositories</h3>
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-2">
                <div className="text-xs font-bold text-white uppercase border-b border-white/10 pb-1 mb-2">Strength Performance Tracking Arrays</div>
                {strengthLogs.map(log => (
                  <div key={log.id} className="text-xs flex justify-between font-mono py-1 border-b border-white/5">
                    <span className="text-[#7b7f9e] font-mono">[{log.id}] {log.date}</span>
                    <span className="text-white uppercase">{log.exercise}</span>
                    <span className="text-[#ff00a0] font-bold">{log.sets}x{log.reps} @ {log.weight}KG</span>
                  </div>
                ))}
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-4 max-h-[200px] overflow-y-auto space-y-2">
                <div className="text-xs font-bold text-white uppercase border-b border-white/10 pb-1 mb-2">Aerobic Displacement Output Runs</div>
                {cardioLogs.map(log => (
                  <div key={log.id} className="text-xs flex justify-between font-mono py-1 border-b border-white/5">
                    <span className="text-[#7b7f9e]">[{log.id}] {log.date}</span>
                    <span className="text-white uppercase">{log.activity}</span>
                    <span className="text-[#d946ef] font-bold">{log.duration}m | {log.distance}KM</span>
                  </div>
                ))}
              </div>

              {/* TERMINATE MODULE REGISTRY */}
              <div className="bg-[#120b1c]/80 border border-red-500/25 p-4 rounded-xl space-y-3">
                <div className="text-xs font-bold text-red-400 uppercase tracking-widest">Terminate Tracked Record Packet Node</div>
                <div className="grid grid-cols-3 gap-2">
                  <select value={purgeChoice} onChange={e => setPurgeChoice(e.target.value)} className="bg-[#0c0712] border border-red-500/30 rounded p-1 text-xs text-red-400">
                    <option>Strength</option><option>Cardio</option>
                  </select>
                  <input type="number" placeholder="ID Vector" value={purgeId} onChange={e => setPurgeId(e.target.value)} className="bg-[#0c0712] border border-red-500/30 rounded p-1 text-xs text-red-400" />
                  <button onClick={handlePurgeLog} className="bg-red-950/40 border border-red-500 text-red-400 font-bold uppercase text-[10px] rounded hover:bg-red-500 hover:text-black transition">Purge Record</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}