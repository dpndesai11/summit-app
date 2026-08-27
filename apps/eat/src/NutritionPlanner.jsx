import { useState, useEffect } from 'react';
import {
  CalendarDays, ShoppingCart, ChefHat, Coffee, Apple, Sandwich, Cookie, CookingPot,
  Plus, X, Trash2, Check, ChevronDown, Loader2, AlertTriangle, RefreshCw, ClipboardList
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

const EMPTY_DAY = { breakfast: null, snack1: null, lunch: null, snack2: null, dinner: null };
const EMPTY_PLAN = DAYS.reduce((acc, d) => ({ ...acc, [d]: { ...EMPTY_DAY } }), {});

const DEFAULT_RECIPES = [
  { id: 1, name: 'Overnight Oats', ingredients: ['Rolled oats', 'Milk', 'Chia seeds', 'Honey', 'Berries'], notes: 'Mix and refrigerate overnight.' },
  { id: 2, name: 'Chicken Stir-fry', ingredients: ['Chicken breast', 'Broccoli', 'Bell pepper', 'Soy sauce', 'Garlic', 'Rice'], notes: '' },
];

// A day's slots may predate this shape (missing keys, or a legacy string
// value) — normalize on read so older data never crashes the UI.
const normalizeDay = (raw) => {
  const day = { ...EMPTY_DAY };
  SLOTS.forEach(s => {
    const v = raw?.[s];
    day[s] = (typeof v === 'string' && v.trim()) ? v : null;
  });
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
  // 5-8 ingredients at once beats typing them one at a time.
  const [builder, setBuilder] = useState({
    name: '', ingredients: [], notes: '', mode: 'list', bulkText: '', draftName: ''
  });
  const [builderOpen, setBuilderOpen] = useState(false);

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
  const assignSlot = (day, slot, recipeName) => {
    updatePlan({ ...plan, [day]: { ...plan[day], [slot]: recipeName || null } });
  };

  const clearDay = (day) => {
    updatePlan({ ...plan, [day]: { ...EMPTY_DAY } });
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

  const createRecipe = () => {
    if (!builder.name.trim() || builder.ingredients.length === 0) return;
    updateRecipes([...recipes, {
      id: Date.now(), name: builder.name.trim(), ingredients: builder.ingredients, notes: builder.notes.trim()
    }]);
    setBuilder({ name: '', ingredients: [], notes: '', mode: 'list', bulkText: '', draftName: '' });
    setBuilderOpen(false);
    showToast('Recipe saved');
  };

  const deleteRecipe = (id) => {
    const recipe = recipes.find(r => r.id === id);
    updateRecipes(recipes.filter(r => r.id !== id));
    // Un-assign it from any day/slot it was scheduled in.
    if (recipe) {
      const next = {};
      DAYS.forEach(d => {
        next[d] = { ...plan[d] };
        SLOTS.forEach(s => { if (next[d][s] === recipe.name) next[d][s] = null; });
      });
      updatePlan(next);
    }
  };

  // --- Shopping list -----------------------------------------------------------
  // Always derived live from the current week's plan — never stored — so
  // editing a recipe or the plan is instantly reflected here.
  const shoppingItems = (() => {
    const map = new Map();
    DAYS.forEach(day => {
      SLOTS.forEach(slot => {
        const recipeName = plan[day]?.[slot];
        if (!recipeName) return;
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
    (a, d) => a + SLOTS.filter(s => plan[d]?.[s]).length, 0
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

      {SLOTS.map(slot => {
        const meta = SLOT_META[slot];
        const Icon = meta.icon;
        const recipeName = plan[todayName]?.[slot];
        const recipe = recipeName ? recipes.find(r => r.name === recipeName) : null;
        const eKey = `today::${slot}`;
        const expanded = expandedIngredient === eKey;
        if (!recipe) {
          return (
            <div key={slot} className="bg-white rounded-2xl border border-dashed border-gray-200 p-4 opacity-60">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-300" />
                <span className="font-medium text-gray-400 text-sm">{meta.label}</span>
                <span className="text-[10px] text-gray-300 ml-auto">Not planned</span>
              </div>
            </div>
          );
        }
        return (
          <div key={slot} className="bg-white rounded-2xl border border-gray-200 p-4">
            <button
              onClick={() => setExpandedIngredient(expanded ? null : eKey)}
              className="w-full flex items-center gap-2"
            >
              <Icon className={`w-4 h-4 ${meta.text}`} />
              <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.label}</span>
              <span className="font-semibold text-gray-900 text-sm truncate">{recipe.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {recipe.ingredients.map((ing, i) => (
                    <span key={i} className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{ing}</span>
                  ))}
                </div>
                {recipe.notes && <p className="text-xs text-gray-500">{recipe.notes}</p>}
              </div>
            )}
          </div>
        );
      })}

      {SLOTS.every(s => !plan[todayName]?.[s]) && (
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
            const dayPlan = plan[day] || EMPTY_DAY;
            const plannedCount = SLOTS.filter(s => dayPlan[s]).length;
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
                  <span className="text-[11px] text-gray-400">{plannedCount}/5 planned</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && (
                  <div className="bg-white p-3 space-y-2 border border-t-0 border-gray-100 rounded-b-xl">
                    {SLOTS.map(slot => {
                      const meta = SLOT_META[slot];
                      const Icon = meta.icon;
                      return (
                        <div key={slot} className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.text}`} />
                          <span className="text-[11px] text-gray-500 w-16 flex-shrink-0">{meta.label}</span>
                          <div className="relative flex-1 min-w-0">
                            <select
                              value={dayPlan[slot] || ''}
                              onChange={e => assignSlot(day, slot, e.target.value)}
                              className={`w-full appearance-none rounded-lg px-3 py-1.5 text-xs outline-none ${
                                dayPlan[slot] ? 'bg-white border border-gray-200 text-gray-900 font-medium' : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              <option value="">—</option>
                              {recipes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 text-sm">Recipes</span>
          <button onClick={() => setBuilderOpen(o => !o)}
            className="flex items-center gap-1 text-[11px] font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-lg active:bg-green-100">
            {builderOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {builderOpen ? 'Cancel' : 'New'}
          </button>
        </div>

        {builderOpen && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
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

            <button onClick={createRecipe}
              disabled={!builder.name.trim() || builder.ingredients.length === 0}
              className="w-full h-10 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40 active:bg-green-700">
              Save recipe
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
                {expanded && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    {r.notes && <p className="text-xs text-gray-500 mb-2">{r.notes}</p>}
                    <button onClick={() => deleteRecipe(r.id)} className="text-[11px] text-red-500 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Delete recipe
                    </button>
                  </div>
                )}
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
                      className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                        checked ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
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
                  {expanded && (
                    <div className="mt-1.5 pl-7 flex flex-wrap gap-1">
                      {item.uses.map((u, i) => (
                        <span key={i} className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                          {u.recipe} · {u.day.slice(0, 3)} {SLOT_META[u.slot].label}
                        </span>
                      ))}
                    </div>
                  )}
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
                  className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                    e.checked ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
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
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-green-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-xs text-gray-400">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#37352f] font-sans antialiased">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap ${
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
