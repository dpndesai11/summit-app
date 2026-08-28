import { useState, useEffect } from 'react';
import {
  CalendarDays, ShoppingCart, ChefHat, Coffee, Apple, Sandwich, Cookie, CookingPot,
  Plus, X, Trash2, Check, ChevronDown, AlertTriangle, RefreshCw, ClipboardList, Pencil
} from 'lucide-react';
import { dbGet, dbSet, dbRefresh } from './lib/db';

// ---------------------------------------------------------------------------
// Summit — Eat (mobile-first)
// Persists through lib/db (summit-data.json) via the GitHub API, same pattern
// and same data repo as the tasks and fitness apps — separate storage keys,
// no shared code.
//
// Three tabs:
//  - Today: this weekday's five meal slots, read at a glance while cooking.
//  - Week:  the recurring weekly plan (Mon-Sun x 5 slots) plus the recipe
//           library that fills it.
//  - Shopping: ingredients from every recipe assigned anywhere in the week,
//           aggregated by name with a "used in N meals" count, plus a plain
//           manually-added list for anything that isn't from a recipe.
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  recipes: 'summit_recipes',
  weeklyMealPlan: 'summit_weekly_meal_plan',
  shoppingChecked: 'summit_shopping_checked',
  shoppingExtras: 'summit_shopping_extras',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Five named slots per day, in display order. Icon + color give each one a
// consistent identity across Today, Week, and recipe pickers.
const SLOTS = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'];
const SLOT_META = {
  breakfast: { label: 'Breakfast', icon: Coffee, text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700', bg: 'bg-amber-500' },
  snack1: { label: 'Snack 1', icon: Apple, text: 'text-rose-500', badge: 'bg-rose-50 text-rose-600', bg: 'bg-rose-500' },
  lunch: { label: 'Lunch', icon: Sandwich, text: 'text-blue-600', badge: 'bg-blue-50 text-blue-700', bg: 'bg-blue-600' },
  snack2: { label: 'Snack 2', icon: Cookie, text: 'text-rose-500', badge: 'bg-rose-50 text-rose-600', bg: 'bg-rose-500' },
  dinner: { label: 'Dinner', icon: CookingPot, text: 'text-purple-600', badge: 'bg-purple-50 text-purple-700', bg: 'bg-purple-600' },
};

// Each slot holds a LIST of recipe names — not just one — so a slot can
// carry a meal plus a side, or several snacks, the same "list per day/slot"
// pattern the fitness app uses for multi-workout days.
const emptyDay = () => ({ breakfast: [], snack1: [], lunch: [], snack2: [], dinner: [] });
const EMPTY_PLAN = DAYS.reduce((acc, d) => ({ ...acc, [d]: emptyDay() }), {});

const DEFAULT_RECIPES = [
  { id: 1, name: 'Overnight Oats', ingredients: ['Rolled oats', 'Milk', 'Chia seeds', 'Honey', 'Berries'], notes: 'Mix and refrigerate overnight.' },
  { id: 2, name: 'Chicken Stir-fry', ingredients: ['Chicken breast', 'Broccoli', 'Bell pepper', 'Soy sauce', 'Garlic', 'Rice'], notes: '' },
];

// A slot's value may be a list of recipe names (current shape) or a single
// string / null (legacy shape, one recipe per slot) — normalize on read so
// older data upgrades in place instead of crashing the UI.
const slotList = (v) => {
  if (Array.isArray(v)) return v.filter(n => typeof n === 'string' && n.trim());
  if (typeof v === 'string' && v.trim()) return [v];
  return [];
};

const normalizeDay = (raw) => {
  const day = emptyDay();
  SLOTS.forEach(s => { day[s] = slotList(raw?.[s]); });
  return day;
};

const normalizePlan = (raw) => DAYS.reduce((acc, d) => ({ ...acc, [d]: normalizeDay(raw?.[d]) }), {});

const normalizeIngredientName = (s) => s.trim().replace(/\s+/g, ' ');
const ingredientKey = (s) => normalizeIngredientName(s).toLowerCase();

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 truncate">{sub}</div>}
    </div>
  );
}

export default function NutritionPlanner() {
  const [tab, setTab] = useState('today');
  const [recipes, setRecipes] = useState(DEFAULT_RECIPES);
  const [plan, setPlan] = useState(EMPTY_PLAN);
  const [shoppingChecked, setShoppingChecked] = useState({});
  const [shoppingExtras, setShoppingExtras] = useState([]);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [expandedDays, setExpandedDays] = useState({});
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [expandedIngredient, setExpandedIngredient] = useState(null);

  // Recipe builder. Bulk "paste a list" is the default entry mode — pasting
  // 5-8 ingredients at once beats typing them one at a time. The same form
  // is reused for editing: editingRecipeId set means Save updates that
  // recipe in place instead of creating a new one.
  const [builder, setBuilder] = useState({
    name: '', ingredients: [], notes: '', mode: 'list', bulkText: '', draftName: ''
  });
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState(null);

  const [extraInput, setExtraInput] = useState('');

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const showToast = (msg, isError = false) => {
    setToast({ message: msg, isError });
    setTimeout(() => setToast(null), 2200);
  };

  // --- Persistence (summit-data.json via lib/db) -----------------------------
  const saveToStorage = (storageKey, data) => {
    dbSet(storageKey, data).catch(() => {
      showToast('Save failed — change may not persist.', true);
    });
  };

  const loadAll = async () => {
    const loadData = async (storageKey, fallback) => {
      try {
        const val = await dbGet(storageKey);
        return val ?? fallback;
      } catch {
        return fallback;
      }
    };
    const [rc, wmp, sc, se] = await Promise.all([
      loadData(STORAGE_KEYS.recipes, DEFAULT_RECIPES),
      loadData(STORAGE_KEYS.weeklyMealPlan, EMPTY_PLAN),
      loadData(STORAGE_KEYS.shoppingChecked, {}),
      loadData(STORAGE_KEYS.shoppingExtras, []),
    ]);
    setRecipes(Array.isArray(rc) ? rc : DEFAULT_RECIPES);
    setPlan(normalizePlan(wmp));
    setShoppingChecked(sc && typeof sc === 'object' ? sc : {});
    setShoppingExtras(Array.isArray(se) ? se : []);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadAll();
      } catch {
        setLoadError('Could not load saved data. Starting fresh — new entries will still try to save.');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshFromRemote = async () => {
    setIsRefreshing(true);
    try {
      await dbRefresh();
      await loadAll();
      showToast('Refreshed');
    } catch {
      showToast('Refresh failed — check your connection', true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateRecipes = (next) => { setRecipes(next); saveToStorage(STORAGE_KEYS.recipes, next); };
  const updatePlan = (next) => { setPlan(next); saveToStorage(STORAGE_KEYS.weeklyMealPlan, next); };
  const updateShoppingChecked = (next) => { setShoppingChecked(next); saveToStorage(STORAGE_KEYS.shoppingChecked, next); };
  const updateShoppingExtras = (next) => { setShoppingExtras(next); saveToStorage(STORAGE_KEYS.shoppingExtras, next); };

  // --- Plan actions ------------------------------------------------------------
  const addToSlot = (day, slot, recipeName) => {
    if (!recipeName) return;
    const current = plan[day]?.[slot] || [];
    if (current.includes(recipeName)) return;
    updatePlan({ ...plan, [day]: { ...plan[day], [slot]: [...current, recipeName] } });
  };

  const removeFromSlot = (day, slot, recipeName) => {
    const current = plan[day]?.[slot] || [];
    updatePlan({ ...plan, [day]: { ...plan[day], [slot]: current.filter(n => n !== recipeName) } });
  };

  const clearDay = (day) => {
    updatePlan({ ...plan, [day]: emptyDay() });
  };

  const clearWeek = () => {
    updatePlan(EMPTY_PLAN);
    showToast('Week cleared');
  };

  // --- Recipe builder ------------------------------------------------------
  const addDraftIngredient = () => {
    const name = normalizeIngredientName(builder.draftName);
    if (!name) return;
    if (builder.ingredients.some(i => ingredientKey(i) === ingredientKey(name))) {
      setBuilder(p => ({ ...p, draftName: '' }));
      return;
    }
    setBuilder(p => ({ ...p, ingredients: [...p.ingredients, name], draftName: '' }));
  };

  // One ingredient per line, or comma-separated — covers both pasting from a
  // notes app and typing a quick list. Duplicates (case-insensitive) are
  // dropped so re-pasting an overlapping list doesn't create repeats.
  const addBulkIngredients = () => {
    const names = builder.bulkText
      .split(/[\n,]+/)
      .map(normalizeIngredientName)
      .filter(Boolean);
    if (names.length === 0) return;
    setBuilder(p => {
      const seen = new Set(p.ingredients.map(ingredientKey));
      const additions = [];
      names.forEach(n => {
        const k = ingredientKey(n);
        if (!seen.has(k)) { seen.add(k); additions.push(n); }
      });
      return { ...p, ingredients: [...p.ingredients, ...additions], bulkText: '' };
    });
  };

  const removeBuilderIngredient = (i) => {
    setBuilder(p => ({ ...p, ingredients: p.ingredients.filter((_, j) => j !== i) }));
  };

  const resetBuilder = () => {
    setBuilder({ name: '', ingredients: [], notes: '', mode: 'list', bulkText: '', draftName: '' });
    setEditingRecipeId(null);
    setBuilderOpen(false);
  };

  const startEditRecipe = (recipe) => {
    setBuilder({ name: recipe.name, ingredients: [...recipe.ingredients], notes: recipe.notes || '', mode: 'list', bulkText: '', draftName: '' });
    setEditingRecipeId(recipe.id);
    setExpandedRecipeId(null);
    setBuilderOpen(true);
  };

  // Creates a new recipe, or — when editingRecipeId is set — updates that
  // recipe in place. A rename cascades into the weekly plan, since slots
  // reference recipes by name.
  const saveRecipe = () => {
    const name = builder.name.trim();
    if (!name || builder.ingredients.length === 0) return;

    if (editingRecipeId) {
      const prev = recipes.find(r => r.id === editingRecipeId);
      updateRecipes(recipes.map(r => (
        r.id === editingRecipeId ? { ...r, name, ingredients: builder.ingredients, notes: builder.notes.trim() } : r
      )));
      if (prev && prev.name !== name) {
        const next = {};
        DAYS.forEach(d => {
          next[d] = { ...plan[d] };
          SLOTS.forEach(s => { next[d][s] = (plan[d][s] || []).map(n => (n === prev.name ? name : n)); });
        });
        updatePlan(next);
      }
      showToast('Recipe updated');
    } else {
      updateRecipes([...recipes, { id: Date.now(), name, ingredients: builder.ingredients, notes: builder.notes.trim() }]);
      showToast('Recipe saved');
    }
    resetBuilder();
  };

  const deleteRecipe = (id) => {
    const recipe = recipes.find(r => r.id === id);
    updateRecipes(recipes.filter(r => r.id !== id));
    // Un-assign it from any day/slot it was scheduled in.
    if (recipe) {
      const next = {};
      DAYS.forEach(d => {
        next[d] = { ...plan[d] };
        SLOTS.forEach(s => { next[d][s] = (plan[d][s] || []).filter(n => n !== recipe.name); });
      });
      updatePlan(next);
      if (editingRecipeId === id) resetBuilder();
    }
  };

  // --- Shopping list -----------------------------------------------------------
  // Always derived live from the current week's plan — never stored — so
  // editing a recipe or the plan is instantly reflected here.
  const shoppingItems = (() => {
    const map = new Map();
    DAYS.forEach(day => {
      SLOTS.forEach(slot => {
        (plan[day]?.[slot] || []).forEach(recipeName => {
          const recipe = recipes.find(r => r.name === recipeName);
          if (!recipe) return;
          recipe.ingredients.forEach(ing => {
            const key = ingredientKey(ing);
            if (!key) return;
            const entry = map.get(key) || { key, name: normalizeIngredientName(ing), count: 0, uses: [] };
            entry.count += 1;
            entry.uses.push({ recipe: recipe.name, day, slot });
            map.set(key, entry);
          });
        });
      });
    });
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  })();

  const toggleChecked = (key) => {
    updateShoppingChecked({ ...shoppingChecked, [key]: !shoppingChecked[key] });
  };

  const addExtra = () => {
    const name = normalizeIngredientName(extraInput);
    if (!name) return;
    updateShoppingExtras([...shoppingExtras, { id: Date.now(), name, checked: false }]);
    setExtraInput('');
  };

  const toggleExtra = (id) => {
    updateShoppingExtras(shoppingExtras.map(e => (e.id === id ? { ...e, checked: !e.checked } : e)));
  };

  const deleteExtra = (id) => updateShoppingExtras(shoppingExtras.filter(e => e.id !== id));

  const clearAllChecks = () => {
    updateShoppingChecked({});
    updateShoppingExtras(shoppingExtras.map(e => ({ ...e, checked: false })));
    showToast('Checks cleared');
  };

  // --- Stats -----------------------------------------------------------------
  const mealsPlannedThisWeek = DAYS.reduce(
    (a, d) => a + SLOTS.reduce((b, s) => b + (plan[d]?.[s]?.length || 0), 0), 0
  );
  const shoppingItemCount = shoppingItems.length + shoppingExtras.length;

  // --- Today page --------------------------------------------------------------
  const TodayPage = (
    <div className="space-y-3">
      <div className="flex gap-2">
        <StatCard icon={CalendarDays} label="This week" value={mealsPlannedThisWeek} sub="meals planned" />
        <StatCard icon={ChefHat} label="Recipes" value={recipes.length} sub="saved" />
        <StatCard icon={ShoppingCart} label="Shopping" value={shoppingItemCount} sub="items" />
      </div>

      <div className="bg-green-600 rounded-2xl p-4 text-white">
        <div className="text-[11px] uppercase tracking-wide text-green-100">{todayName}</div>
        <div className="text-lg font-bold">Today's meals</div>
      </div>

      {SLOTS.flatMap(slot => {
        const meta = SLOT_META[slot];
        const Icon = meta.icon;
        const recipeNames = plan[todayName]?.[slot] || [];

        if (recipeNames.length === 0) {
          return [(
            <div key={slot} className="bg-white rounded-2xl border border-dashed border-gray-200 p-4 opacity-60">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-300" />
                <span className="font-medium text-gray-400 text-sm">{meta.label}</span>
                <span className="text-[10px] text-gray-300 ml-auto">Not planned</span>
              </div>
            </div>
          )];
        }

        return recipeNames.map(recipeName => {
          const recipe = recipes.find(r => r.name === recipeName);
          if (!recipe) return null;
          const eKey = `today::${slot}::${recipeName}`;
          const expanded = expandedIngredient === eKey;
          return (
            <div key={eKey} className="bg-white rounded-2xl border border-gray-200 p-4">
              <button
                onClick={() => setExpandedIngredient(expanded ? null : eKey)}
                className="w-full flex items-center gap-2"
              >
                <Icon className={`w-4 h-4 ${meta.text}`} />
                <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.label}</span>
                <span className="font-semibold text-gray-900 text-sm truncate">{recipe.name}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-[grid-template-rows] duration-250 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredients.map((ing, i) => (
                        <span key={i} className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{ing}</span>
                      ))}
                    </div>
                    {recipe.notes && <p className="text-xs text-gray-500 whitespace-pre-line">{recipe.notes}</p>}
                  </div>
                </div>
              </div>
            </div>
          );
        }).filter(Boolean);
      })}

      {SLOTS.every(s => (plan[todayName]?.[s] || []).length === 0) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <ChefHat className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <div className="font-semibold text-gray-900 text-sm">Nothing planned for today</div>
          <button onClick={() => setTab('week')} className="text-xs font-medium text-green-600 mt-2">
            Plan this week →
          </button>
        </div>
      )}
    </div>
  );

  // --- Week page ---------------------------------------------------------------
  const WeekPage = (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 text-sm">Weekly plan</span>
          <button onClick={clearWeek}
            className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg active:bg-gray-200">
            Clear week
          </button>
        </div>
        <div className="space-y-1.5">
          {DAYS.map(day => {
            const dayPlan = plan[day] || emptyDay();
            const plannedCount = SLOTS.reduce((a, s) => a + dayPlan[s].length, 0);
            const expanded = !!expandedDays[day];
            return (
              <div key={day} className={`rounded-xl overflow-hidden ${day === todayName ? 'ring-1 ring-green-200' : ''}`}>
                <button
                  onClick={() => setExpandedDays(p => ({ ...p, [day]: !expanded }))}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 ${day === todayName ? 'bg-green-50' : 'bg-gray-50'}`}
                >
                  <span className={`text-xs w-20 text-left flex-shrink-0 ${day === todayName ? 'font-bold text-green-700' : 'text-gray-500'}`}>
                    {day}{day === todayName ? ' •' : ''}
                  </span>
                  <span className="text-[11px] text-gray-400">{plannedCount} planned</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                  <div className="bg-white p-3 space-y-2.5 border border-t-0 border-gray-100 rounded-b-xl">
                    {SLOTS.map(slot => {
                      const meta = SLOT_META[slot];
                      const Icon = meta.icon;
                      const assignedNames = dayPlan[slot];
                      const available = recipes.filter(r => !assignedNames.includes(r.name));
                      return (
                        <div key={slot} className="flex items-start gap-2">
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-1.5 ${meta.text}`} />
                          <span className="text-[11px] text-gray-500 w-16 flex-shrink-0 mt-1.5">{meta.label}</span>
                          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                            {assignedNames.length === 0 && available.length === 0 && (
                              <span className="text-[11px] text-gray-300 py-1">No recipes yet</span>
                            )}
                            {assignedNames.map(name => (
                              <span key={name}
                                className={`text-[11px] rounded-full pl-2.5 pr-1 py-1 flex items-center gap-1 font-medium ${meta.badge}`}>
                                {name}
                                <button onClick={() => removeFromSlot(day, slot, name)}
                                  className="opacity-60 active:opacity-100" aria-label={`Remove ${name} from ${day} ${meta.label}`}>
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                            {available.length > 0 && (
                              <div className="relative">
                                <select
                                  value=""
                                  onChange={e => addToSlot(day, slot, e.target.value)}
                                  className="appearance-none bg-gray-100 text-gray-500 rounded-full pl-2.5 pr-6 py-1 text-[11px] outline-none"
                                  aria-label={`Add to ${day} ${meta.label}`}
                                >
                                  <option value="" disabled>+ Add</option>
                                  {available.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {plannedCount > 0 && (
                      <button onClick={() => clearDay(day)} className="text-[11px] text-red-500 flex items-center gap-1 pt-1">
                        <Trash2 className="w-3 h-3" /> Clear {day}
                      </button>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 text-sm">Recipes</span>
          <button onClick={() => (builderOpen ? resetBuilder() : setBuilderOpen(true))}
            className="flex items-center gap-1 text-[11px] font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-lg active:bg-green-100">
            {builderOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {builderOpen ? 'Cancel' : 'New'}
          </button>
        </div>

        {builderOpen && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
            {editingRecipeId && (
              <div className="text-[11px] font-medium text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5 flex items-center gap-1">
                <Pencil className="w-3 h-3" /> Editing recipe
              </div>
            )}
            <input
              value={builder.name}
              onChange={e => setBuilder(p => ({ ...p, name: e.target.value }))}
              placeholder="Recipe name"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500"
            />

            <div className="flex bg-gray-200/60 rounded-lg p-0.5">
              {[['list', 'Paste a list'], ['single', 'One at a time']].map(([mode, label]) => (
                <button key={mode}
                  onClick={() => setBuilder(p => ({ ...p, mode }))}
                  className={`flex-1 text-[11px] font-medium py-1.5 rounded-md ${
                    builder.mode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {builder.mode === 'list' ? (
              <>
                <textarea
                  value={builder.bulkText}
                  onChange={e => setBuilder(p => ({ ...p, bulkText: e.target.value }))}
                  placeholder={'One ingredient per line, or comma-separated:\nOnion\nChicken breast, Garlic'}
                  rows={4}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 resize-none"
                />
                <button onClick={addBulkIngredients}
                  disabled={!builder.bulkText.trim()}
                  className="w-full bg-gray-900 text-white rounded-lg py-2 text-xs font-semibold disabled:opacity-40 active:bg-gray-700 flex items-center justify-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" /> Add list
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <input
                  value={builder.draftName}
                  onChange={e => setBuilder(p => ({ ...p, draftName: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addDraftIngredient()}
                  placeholder="Ingredient"
                  className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500"
                />
                <button onClick={addDraftIngredient}
                  className="bg-gray-900 text-white rounded-lg px-3 flex-shrink-0 active:bg-gray-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {builder.ingredients.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {builder.ingredients.map((ing, i) => (
                  <span key={i} className="text-[11px] bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                    {ing}
                    <button onClick={() => removeBuilderIngredient(i)} aria-label={`Remove ${ing}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <textarea
              value={builder.notes}
              onChange={e => setBuilder(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes / instructions (optional)"
              rows={2}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 resize-none"
            />

            <button onClick={saveRecipe}
              disabled={!builder.name.trim() || builder.ingredients.length === 0}
              className="w-full h-10 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40 active:bg-green-700">
              {editingRecipeId ? 'Save changes' : 'Save recipe'}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {recipes.map(r => {
            const expanded = expandedRecipeId === r.id;
            return (
              <div key={r.id} className="border border-gray-200 rounded-xl p-3">
                <button onClick={() => setExpandedRecipeId(expanded ? null : r.id)} className="w-full flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-900">{r.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-gray-400">{r.ingredients.length} ingredients</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                <div className="flex flex-wrap gap-1">
                  {(expanded ? r.ingredients : r.ingredients.slice(0, 6)).map((ing, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{ing}</span>
                  ))}
                  {!expanded && r.ingredients.length > 6 && (
                    <span className="text-[10px] px-2 py-0.5 text-gray-400">+{r.ingredients.length - 6} more</span>
                  )}
                </div>
                <div className={`grid transition-[grid-template-rows] duration-250 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      {r.notes && <p className="text-xs text-gray-500 mb-2 whitespace-pre-line">{r.notes}</p>}
                      <div className="flex gap-3">
                        <button onClick={() => startEditRecipe(r)} className="text-[11px] text-green-700 flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> Edit recipe
                        </button>
                        <button onClick={() => deleteRecipe(r.id)} className="text-[11px] text-red-500 flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Delete recipe
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {recipes.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">No recipes yet — create one above.</p>
          )}
        </div>
      </div>
    </div>
  );

  // --- Shopping page -------------------------------------------------------------
  const ShoppingPage = (
    <div className="space-y-3">
      <div className="flex gap-2">
        <StatCard icon={ShoppingCart} label="From recipes" value={shoppingItems.length} />
        <StatCard icon={Plus} label="Extra items" value={shoppingExtras.length} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 text-sm">From this week's plan</span>
          {(Object.values(shoppingChecked).some(Boolean) || shoppingExtras.some(e => e.checked)) && (
            <button onClick={clearAllChecks} className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg active:bg-gray-200">
              Clear checks
            </button>
          )}
        </div>
        {shoppingItems.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">
            Nothing yet — assign recipes to days in Week and their ingredients show up here.
          </p>
        ) : (
          <div className="space-y-1">
            {shoppingItems.map(item => {
              const checked = !!shoppingChecked[item.key];
              const expanded = expandedIngredient === `shop::${item.key}`;
              return (
                <div key={item.key} className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleChecked(item.key)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                        checked ? 'bg-green-600 border-green-600 animate-success-pulse' : 'border-gray-300 bg-white'
                      }`}
                      aria-label={checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
                    >
                      {checked && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                    <span className={`text-sm flex-1 min-w-0 truncate ${checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.name}
                    </span>
                    <button
                      onClick={() => setExpandedIngredient(expanded ? null : `shop::${item.key}`)}
                      className="flex items-center gap-1 flex-shrink-0"
                    >
                      <span className="text-[10px] text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                        {item.count} meal{item.count === 1 ? '' : 's'}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <div className="mt-1.5 pl-7 flex flex-wrap gap-1">
                        {item.uses.map((u, i) => (
                          <span key={i} className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                            {u.recipe} · {u.day.slice(0, 3)} {SLOT_META[u.slot].label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <span className="font-semibold text-gray-900 text-sm block mb-3">Other items</span>
        <div className="flex gap-2 mb-3">
          <input
            value={extraInput}
            onChange={e => setExtraInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExtra()}
            placeholder="e.g. Paper towels"
            className="flex-1 min-w-0 bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-green-500"
          />
          <button onClick={addExtra} className="bg-gray-900 text-white rounded-xl px-4 flex-shrink-0 active:bg-gray-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {shoppingExtras.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">Nothing added manually yet.</p>
        ) : (
          <div className="space-y-1">
            {shoppingExtras.map(e => (
              <div key={e.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <button
                  onClick={() => toggleExtra(e.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                    e.checked ? 'bg-green-600 border-green-600 animate-success-pulse' : 'border-gray-300 bg-white'
                  }`}
                  aria-label={e.checked ? `Uncheck ${e.name}` : `Check ${e.name}`}
                >
                  {e.checked && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className={`text-sm flex-1 min-w-0 truncate ${e.checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {e.name}
                </span>
                <button onClick={() => deleteExtra(e.id)} className="text-gray-300 active:text-red-500 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const TABS = [
    { id: 'today', label: 'Today', icon: ChefHat },
    { id: 'week', label: 'Week', icon: CalendarDays },
    { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f5]">
        <div className="max-w-md mx-auto px-4 pt-5 pb-28 space-y-3">
          <div className="skeleton h-6 w-24" />
          <div className="flex gap-2">
            <div className="skeleton h-[74px] flex-1" />
            <div className="skeleton h-[74px] flex-1" />
            <div className="skeleton h-[74px] flex-1" />
          </div>
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#37352f] font-sans antialiased">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-toast-in ${
          toast.isError ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          {toast.message}
        </div>
      )}

      <div className="sticky top-0 z-40 bg-[#f7f7f5]/90 backdrop-blur px-4 pt-5 pb-3">
        <div className="max-w-md mx-auto flex items-baseline justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            {tab === 'today' ? 'Today' : tab === 'week' ? 'Week' : 'Shopping'}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshFromRemote}
              disabled={isRefreshing}
              aria-label="Refresh data"
              className="text-gray-400 active:text-gray-600 disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-xs text-gray-400">{todayName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-28">
        {loadError && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}
        {tab === 'today' && TodayPage}
        {tab === 'week' && WeekPage}
        {tab === 'shopping' && ShoppingPage}
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 ${
                tab === id ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
