import { useState, useEffect } from 'react';
import {
  CalendarDays, ShoppingCart, ChefHat, Coffee, Apple, Sandwich, Cookie, CookingPot,
  Plus, X, Trash2, Check, ChevronDown, AlertTriangle, RefreshCw, ClipboardList, Pencil, Target, Database, Clock
} from 'lucide-react';
import { dbGet, dbSet, dbRefresh } from './lib/db';
import CollapsibleCard from './components/CollapsibleCard';

// ---------------------------------------------------------------------------
// Summit Daily — Meals section (formerly the standalone Eat app).
// Persists through lib/db (summit-data.json) via the GitHub API, same keys
// the old Eat app used. Its own "Today" tab is gone — that's now the shared
// Dashboard, which reads summit_meal_times (new here, with sensible
// slot-based defaults) to place meals on a timeline.
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  recipes: 'summit_recipes',
  weeklyMealPlan: 'summit_weekly_meal_plan',
  mealTimes: 'summit_meal_times',
  shoppingChecked: 'summit_shopping_checked',
  shoppingExtras: 'summit_shopping_extras',
  ingredients: 'summit_ingredients',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const parseRange = (s) => {
  const m = s.match(/(\d+)-(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
const PROTEIN_TARGET = '150-155g';
const FIBRE_TARGET = '30-40g';
const CARB_TARGETS = {
  Monday: '230-310g', Tuesday: '385-460g', Wednesday: '310-385g',
  Thursday: '385-460g', Friday: '230-310g', Saturday: '310-385g',
  Sunday: 'Duration-scaled — use daily target + intra-ride g/hour once rides exceed ~90min',
};
const PRE_WORKOUT_FUEL = {
  Tuesday: 'Banana, or bread/roll + jam, or small oats (60-90min before the 10km run)',
  Thursday: 'Banana + orange (60-90min before cricket nets)',
  Saturday: 'Banana + orange (60-90min before gym + run)',
};

const SLOTS = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'];
const SLOT_META = {
  breakfast: { label: 'Breakfast', icon: Coffee, text: 'text-amber-600', badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700', bg: 'bg-amber-500', defaultTime: '08:00', defaultDuration: 20 },
  snack1: { label: 'Snack 1', icon: Apple, text: 'text-rose-500', badge: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600', bg: 'bg-rose-500', defaultTime: '11:00', defaultDuration: 10 },
  lunch: { label: 'Lunch', icon: Sandwich, text: 'text-blue-600', badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700', bg: 'bg-blue-600', defaultTime: '13:00', defaultDuration: 30 },
  snack2: { label: 'Snack 2', icon: Cookie, text: 'text-rose-500', badge: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600', bg: 'bg-rose-500', defaultTime: '16:00', defaultDuration: 10 },
  dinner: { label: 'Dinner', icon: CookingPot, text: 'text-purple-600', badge: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700', bg: 'bg-purple-600', defaultTime: '19:00', defaultDuration: 45 },
};

// A mealTimes entry may be the current shape ({time, duration}) or the
// older plain-string shape (just a time, no duration) — normalize on read
// so existing schedules keep their time and just pick up a default length.
const normalizeTimeEntry = (v, defaultTime, defaultDuration) => {
  if (v && typeof v === 'object') return { time: v.time || defaultTime, duration: Number(v.duration) > 0 ? Number(v.duration) : defaultDuration };
  if (typeof v === 'string' && v) return { time: v, duration: defaultDuration };
  return { time: defaultTime, duration: defaultDuration };
};

const emptyDay = () => ({ breakfast: [], snack1: [], lunch: [], snack2: [], dinner: [] });
const EMPTY_PLAN = DAYS.reduce((acc, d) => ({ ...acc, [d]: emptyDay() }), {});

const DEFAULT_RECIPES = [
  { id: 1, name: 'Overnight Oats', ingredients: ['Rolled oats', 'Milk', 'Chia seeds', 'Honey', 'Berries'], notes: 'Mix and refrigerate overnight.' },
  { id: 2, name: 'Chicken Stir-fry', ingredients: ['Chicken breast', 'Broccoli', 'Bell pepper', 'Soy sauce', 'Garlic', 'Rice'], notes: '' },
];

const DEFAULT_INGREDIENTS = [
  { id: 1786600000000, name: 'Little gem lettuce', protein: 1.2, carbs: 1.3, fibre: 1.3 },
  { id: 1786600000001, name: 'Spinach', protein: 2.6, carbs: 0.5, fibre: 1.0 },
  { id: 1786600000002, name: 'Tomato', protein: 0.5, carbs: 2.9, fibre: 1.0 },
  { id: 1786600000003, name: 'Brown onions', protein: 1.0, carbs: 7.6, fibre: 1.1 },
  { id: 1786600000004, name: 'Fresh chilli', protein: 1.8, carbs: 4.2, fibre: 1.5 },
  { id: 1786600000005, name: 'Bananas', protein: 1.1, carbs: 19.3, fibre: 1.4 },
  { id: 1786600000006, name: 'Nectarines', protein: 1.4, carbs: 9.0, fibre: 1.7 },
  { id: 1786600000007, name: 'Oranges (Easy Peelers)', protein: 0.9, carbs: 9.1, fibre: 1.2 },
  { id: 1786600000008, name: 'Apple', protein: 0.6, carbs: 11.1, fibre: 1.2 },
  { id: 1786600000009, name: 'Baby potatoes', protein: 1.8, carbs: 13.6, fibre: 1.8 },
  { id: 1786600000010, name: 'Bread roll', protein: 9.0, carbs: 49.0, fibre: 2.5 },
  { id: 1786600000011, name: 'Pitta bread', protein: 11.9, carbs: 40.0, fibre: 5.7 },
  { id: 1786600000012, name: 'Croissant', protein: 8.6, carbs: 43.4, fibre: 1.6 },
  { id: 1786600000013, name: 'Morning rolls', protein: 9.7, carbs: 47.7, fibre: 1.8 },
  { id: 1786600000014, name: 'Feta', protein: 16.5, carbs: 0.7, fibre: 0.5 },
  { id: 1786600000015, name: 'Protein yogurt', protein: 5.9, carbs: 4.5, fibre: 1.0 },
  { id: 1786600000016, name: 'Mature Cheddar', protein: 25.4, carbs: 0.5, fibre: 0.5 },
  { id: 1786600000017, name: 'Grated Four Cheese Mix', protein: 22.2, carbs: 5.3, fibre: 0.5 },
  { id: 1786600000018, name: 'Firm tofu', protein: 16.5, carbs: 1.1, fibre: 1.9 },
  { id: 1786600000019, name: 'Paneer', protein: 22.0, carbs: 3.2, fibre: 0.5 },
  { id: 1786600000020, name: 'Hummus', protein: 6.7, carbs: 10.7, fibre: 4.9 },
  { id: 1786600000021, name: 'Rana Gnocchi or Ravioli', protein: 6.0, carbs: 28.0, fibre: 2.0 },
  { id: 1786600000022, name: 'Frozen mixed veg', protein: 2.7, carbs: 6.6, fibre: 4.4 },
  { id: 1786600000023, name: 'Frozen butternut squash chunks', protein: 0.9, carbs: 7.4, fibre: 1.4 },
  { id: 1786600000024, name: 'Frozen peas', protein: 5.7, carbs: 9.2, fibre: 6.9 },
  { id: 1786600000025, name: 'Frozen edamame', protein: 12.0, carbs: 2.6, fibre: 4.9 },
  { id: 1786600000026, name: 'Poppi', protein: 0.1, carbs: 1.6, fibre: 0.9 },
  { id: 1786600000027, name: 'Coffee (instant, dry)', protein: 14.0, carbs: 44.0, fibre: 0.0 },
  { id: 1786600000028, name: 'Alpro Barista Coconut', protein: 1.5, carbs: 3.3, fibre: 0.5 },
  { id: 1786600000029, name: 'Ginger & Garlic paste', protein: 1.5, carbs: 18.0, fibre: 2.0 },
  { id: 1786600000030, name: 'Ghee', protein: 0.5, carbs: 0.5, fibre: 0.5 },
  { id: 1786600000031, name: 'Lemon juice', protein: 0.5, carbs: 1.2, fibre: 0.5 },
  { id: 1786600000032, name: 'Mustard', protein: 7.9, carbs: 3.8, fibre: 1.9 },
  { id: 1786600000033, name: 'Almonds', protein: 21.2, carbs: 21.7, fibre: 12.5 },
  { id: 1786600000034, name: 'Green curry paste', protein: 2.5, carbs: 19.0, fibre: 0.5 },
  { id: 1786600000035, name: 'Red curry paste', protein: 2.2, carbs: 12.0, fibre: 0.5 },
  { id: 1786600000036, name: 'Canned coconut milk (light)', protein: 0.5, carbs: 3.1, fibre: 0.0 },
  { id: 1786600000037, name: 'Passata', protein: 1.5, carbs: 4.2, fibre: 0.5 },
  { id: 1786600000038, name: 'Soy sauce', protein: 1.0, carbs: 15.5, fibre: 1.9 },
  { id: 1786600000039, name: 'Chickpeas, canned', protein: 7.7, carbs: 16.5, fibre: 6.1 },
  { id: 1786600000040, name: 'Kidney beans, canned', protein: 8.1, carbs: 12.8, fibre: 7.8 },
  { id: 1786600000041, name: 'Rice', protein: 2.8, carbs: 26.5, fibre: 0.6 },
  { id: 1786600000042, name: 'Quinoa', protein: 3.5, carbs: 14.9, fibre: 2.3 },
  { id: 1786600000043, name: 'Red Lentil Penne', protein: 12.4, carbs: 24.0, fibre: 3.6 },
  { id: 1786600000044, name: 'Soba noodles', protein: 15.0, carbs: 69.0, fibre: 4.6 },
  { id: 1786600000045, name: 'Olive oil', protein: 0.1, carbs: 0.1, fibre: 0.1 },
  { id: 1786600000046, name: 'Black pepper', protein: 11.0, carbs: 65.0, fibre: 27.0 },
  { id: 1786600000047, name: 'Peanuts', protein: 29.0, carbs: 7.2, fibre: 7.3 },
  { id: 1786600000048, name: 'Walnuts', protein: 14.7, carbs: 3.3, fibre: 4.1 },
  { id: 1786600000049, name: 'Whey protein isolate', protein: 79.0, carbs: 3.1, fibre: 0.0 },
  { id: 1786600000050, name: 'Creatine monohydrate', protein: 0.0, carbs: 0.0, fibre: 0.0 },
  { id: 1786600000051, name: 'SiS Go Hydro tablets', protein: 0.5, carbs: 16.0, fibre: 4.1 },
  { id: 1786600000052, name: 'Love Corn', protein: 7.4, carbs: 66.0, fibre: 7.0 },
  { id: 1786600000053, name: 'Pickles', protein: 0.9, carbs: 4.4, fibre: 1.4 },
  { id: 1786600000054, name: 'Olives, pitted', protein: 1.0, carbs: 0.5, fibre: 3.9 },
  { id: 1786600000055, name: 'Jam', protein: 0.5, carbs: 58.4, fibre: 1.2 },
  { id: 1786600000056, name: 'Chia seeds', protein: 21.8, carbs: 8.6, fibre: 33.7 },
  { id: 1786600000057, name: 'Barebells Protein Bar', protein: 30.0, carbs: 32.0, fibre: 3.0 },
  { id: 1786600000058, name: 'Deliciously Ella oat bars', protein: 8.0, carbs: 55.0, fibre: 5.0 },
  { id: 1786600000059, name: 'Merchant Gourmet Thai Green Lentil Curry', protein: 5.0, carbs: 12.0, fibre: 3.0 },
  { id: 1786600000060, name: 'Merchant Gourmet 3 Bean & Lentil Chilli', protein: 4.0, carbs: 11.0, fibre: 4.0 },
];

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

const normalizeIngredient = (ing) => (
  typeof ing === 'string'
    ? { name: normalizeIngredientName(ing), quantity: null }
    : { name: normalizeIngredientName(ing.name || ''), quantity: ing.quantity || null }
);
const normalizeRecipeIngredients = (ingredients) => (Array.isArray(ingredients) ? ingredients.map(normalizeIngredient) : []);

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-[#252525] rounded-2xl border border-gray-200 dark:border-white/10 p-4 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{sub}</div>}
    </div>
  );
}

function MacroBar({ label, actual, range, targetLabel }) {
  const pct = range ? Math.max(0, Math.min(100, (actual / range[1]) * 100)) : 0;
  const inRange = range && actual >= range[0] && actual <= range[1];
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="font-medium text-gray-600 dark:text-gray-300">{label}</span>
        <span className="text-gray-400 dark:text-gray-500">{actual}g <span className="text-gray-300 dark:text-gray-600">/ {targetLabel}</span></span>
      </div>
      {range ? (
        <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${inRange ? 'bg-green-500' : 'bg-green-300'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full" />
      )}
    </div>
  );
}

export default function MealsSection() {
  const [subTab, setSubTab] = useState('week');
  const [recipes, setRecipes] = useState(DEFAULT_RECIPES);
  const [plan, setPlan] = useState(EMPTY_PLAN);
  const [mealTimes, setMealTimes] = useState({});
  const [shoppingChecked, setShoppingChecked] = useState({});
  const [shoppingExtras, setShoppingExtras] = useState([]);
  const [ingredientDb, setIngredientDb] = useState(DEFAULT_INGREDIENTS);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [expandedDays, setExpandedDays] = useState({});
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [expandedIngredient, setExpandedIngredient] = useState(null);

  const [builder, setBuilder] = useState({
    name: '', ingredients: [], notes: '', mode: 'list', bulkText: '', draftName: '',
    advanced: false, nutritionEnabled: false, protein: '', carbs: '', fibre: ''
  });
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState(null);

  const [dbBuilder, setDbBuilder] = useState({ name: '', protein: '', carbs: '', fibre: '' });
  const [dbBuilderOpen, setDbBuilderOpen] = useState(false);
  const [editingDbId, setEditingDbId] = useState(null);

  const [extraInput, setExtraInput] = useState('');

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const showToast = (msg, isError = false) => {
    setToast({ message: msg, isError });
    setTimeout(() => setToast(null), 2200);
  };

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
    const [rc, wmp, mt, sc, se, ing] = await Promise.all([
      loadData(STORAGE_KEYS.recipes, DEFAULT_RECIPES),
      loadData(STORAGE_KEYS.weeklyMealPlan, EMPTY_PLAN),
      loadData(STORAGE_KEYS.mealTimes, {}),
      loadData(STORAGE_KEYS.shoppingChecked, {}),
      loadData(STORAGE_KEYS.shoppingExtras, []),
      loadData(STORAGE_KEYS.ingredients, DEFAULT_INGREDIENTS),
    ]);
    setRecipes((Array.isArray(rc) ? rc : DEFAULT_RECIPES).map(r => ({ ...r, ingredients: normalizeRecipeIngredients(r.ingredients) })));
    setPlan(normalizePlan(wmp));
    setMealTimes(mt && typeof mt === 'object' ? mt : {});
    setShoppingChecked(sc && typeof sc === 'object' ? sc : {});
    setShoppingExtras(Array.isArray(se) ? se : []);
    setIngredientDb(Array.isArray(ing) ? ing : DEFAULT_INGREDIENTS);
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
  const updateMealTimes = (next) => { setMealTimes(next); saveToStorage(STORAGE_KEYS.mealTimes, next); };
  const updateShoppingChecked = (next) => { setShoppingChecked(next); saveToStorage(STORAGE_KEYS.shoppingChecked, next); };
  const updateShoppingExtras = (next) => { setShoppingExtras(next); saveToStorage(STORAGE_KEYS.shoppingExtras, next); };
  const updateIngredientDb = (next) => { setIngredientDb(next); saveToStorage(STORAGE_KEYS.ingredients, next); };

  // Time-of-day the Dashboard places this day/slot at. Each slot has a
  // sensible default (breakfast=08:00 etc.) so meals show up on the timeline
  // without any manual setup — this only overrides a specific day's slot.
  const getMealEntry = (day, slot) => normalizeTimeEntry(mealTimes[day]?.[slot], SLOT_META[slot].defaultTime, SLOT_META[slot].defaultDuration);
  const getMealTime = (day, slot) => getMealEntry(day, slot).time;
  const getMealDuration = (day, slot) => getMealEntry(day, slot).duration;
  const setMealTime = (day, slot, time) => {
    const entry = getMealEntry(day, slot);
    updateMealTimes({ ...mealTimes, [day]: { ...mealTimes[day], [slot]: { ...entry, time } } });
  };
  const setMealDuration = (day, slot, duration) => {
    const entry = getMealEntry(day, slot);
    const clamped = Math.max(5, Number(duration) || SLOT_META[slot].defaultDuration);
    updateMealTimes({ ...mealTimes, [day]: { ...mealTimes[day], [slot]: { ...entry, duration: clamped } } });
  };

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

  const findDbIngredient = (name) => ingredientDb.find(d => ingredientKey(d.name) === ingredientKey(name));

  const computeIngredientsNutrition = (ingredients) => {
    let protein = 0, carbs = 0, fibre = 0, matched = 0;
    ingredients.forEach(ing => {
      const db = findDbIngredient(ing.name);
      if (db && ing.quantity) {
        const factor = Number(ing.quantity) / 100;
        protein += db.protein * factor; carbs += db.carbs * factor; fibre += db.fibre * factor;
        matched += 1;
      }
    });
    if (matched === 0) return null;
    return { protein: Math.round(protein), carbs: Math.round(carbs), fibre: Math.round(fibre) };
  };

  const resetDbBuilder = () => {
    setDbBuilder({ name: '', protein: '', carbs: '', fibre: '' });
    setEditingDbId(null);
    setDbBuilderOpen(false);
  };

  const startEditDbIngredient = (item) => {
    setDbBuilder({ name: item.name, protein: item.protein, carbs: item.carbs, fibre: item.fibre });
    setEditingDbId(item.id);
    setDbBuilderOpen(true);
  };

  const saveDbIngredient = () => {
    const name = normalizeIngredientName(dbBuilder.name);
    if (!name) return;
    const entry = {
      name,
      protein: Number(dbBuilder.protein) || 0,
      carbs: Number(dbBuilder.carbs) || 0,
      fibre: Number(dbBuilder.fibre) || 0,
    };
    if (editingDbId) {
      updateIngredientDb(ingredientDb.map(d => (d.id === editingDbId ? { ...d, ...entry } : d)));
      showToast('Ingredient updated');
    } else {
      updateIngredientDb([...ingredientDb, { id: Date.now(), ...entry }]);
      showToast('Ingredient added');
    }
    resetDbBuilder();
  };

  const deleteDbIngredient = (id) => {
    updateIngredientDb(ingredientDb.filter(d => d.id !== id));
    if (editingDbId === id) resetDbBuilder();
  };

  const quickAddDbIngredient = (name) => {
    setDbBuilder({ name, protein: '', carbs: '', fibre: '' });
    setEditingDbId(null);
    setDbBuilderOpen(true);
  };

  const addDraftIngredient = () => {
    const name = normalizeIngredientName(builder.draftName);
    if (!name) return;
    if (builder.ingredients.some(i => ingredientKey(i.name) === ingredientKey(name))) {
      setBuilder(p => ({ ...p, draftName: '' }));
      return;
    }
    setBuilder(p => ({ ...p, ingredients: [...p.ingredients, { name, quantity: null }], draftName: '' }));
  };

  const addBulkIngredients = () => {
    const names = builder.bulkText
      .split(/[\n,]+/)
      .map(normalizeIngredientName)
      .filter(Boolean);
    if (names.length === 0) return;
    setBuilder(p => {
      const seen = new Set(p.ingredients.map(i => ingredientKey(i.name)));
      const additions = [];
      names.forEach(n => {
        const k = ingredientKey(n);
        if (!seen.has(k)) { seen.add(k); additions.push({ name: n, quantity: null }); }
      });
      return { ...p, ingredients: [...p.ingredients, ...additions], bulkText: '' };
    });
  };

  const removeBuilderIngredient = (i) => {
    setBuilder(p => ({ ...p, ingredients: p.ingredients.filter((_, j) => j !== i) }));
  };

  const setBuilderIngredientQuantity = (i, quantity) => {
    setBuilder(p => ({
      ...p,
      ingredients: p.ingredients.map((ing, j) => (j === i ? { ...ing, quantity: quantity === '' ? null : Number(quantity) } : ing))
    }));
  };

  const resetBuilder = () => {
    setBuilder({ name: '', ingredients: [], notes: '', mode: 'list', bulkText: '', draftName: '', advanced: false, nutritionEnabled: false, protein: '', carbs: '', fibre: '' });
    setEditingRecipeId(null);
    setBuilderOpen(false);
  };

  const startEditRecipe = (recipe) => {
    const manual = recipe.nutritionManual ?? (!!recipe.nutrition && !computeIngredientsNutrition(recipe.ingredients));
    setBuilder({
      name: recipe.name, ingredients: recipe.ingredients.map(i => ({ ...i })), notes: recipe.notes || '', mode: 'list', bulkText: '', draftName: '',
      advanced: !!recipe.nutrition || recipe.ingredients.some(i => i.quantity),
      nutritionEnabled: manual,
      protein: manual ? (recipe.nutrition?.protein ?? '') : '',
      carbs: manual ? (recipe.nutrition?.carbs ?? '') : '',
      fibre: manual ? (recipe.nutrition?.fibre ?? '') : ''
    });
    setEditingRecipeId(recipe.id);
    setExpandedRecipeId(null);
    setBuilderOpen(true);
  };

  const builderNutrition = () => {
    if (!builder.nutritionEnabled) return null;
    const p = Number(builder.protein) || 0, c = Number(builder.carbs) || 0, f = Number(builder.fibre) || 0;
    if (!p && !c && !f) return null;
    return { protein: p, carbs: c, fibre: f };
  };

  const saveRecipe = () => {
    const name = builder.name.trim();
    if (!name || builder.ingredients.length === 0) return;
    const manualNutrition = builder.nutritionEnabled ? builderNutrition() : null;
    const nutrition = manualNutrition ?? computeIngredientsNutrition(builder.ingredients);
    const nutritionManual = !!manualNutrition;

    if (editingRecipeId) {
      const prev = recipes.find(r => r.id === editingRecipeId);
      updateRecipes(recipes.map(r => (
        r.id === editingRecipeId ? { ...r, name, ingredients: builder.ingredients, notes: builder.notes.trim(), nutrition, nutritionManual } : r
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
      updateRecipes([...recipes, { id: Date.now(), name, ingredients: builder.ingredients, notes: builder.notes.trim(), nutrition, nutritionManual }]);
      showToast('Recipe saved');
    }
    resetBuilder();
  };

  const deleteRecipe = (id) => {
    const recipe = recipes.find(r => r.id === id);
    updateRecipes(recipes.filter(r => r.id !== id));
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

  const shoppingItems = (() => {
    const map = new Map();
    DAYS.forEach(day => {
      SLOTS.forEach(slot => {
        (plan[day]?.[slot] || []).forEach(recipeName => {
          const recipe = recipes.find(r => r.name === recipeName);
          if (!recipe) return;
          recipe.ingredients.forEach(ing => {
            const key = ingredientKey(ing.name);
            if (!key) return;
            const entry = map.get(key) || { key, name: normalizeIngredientName(ing.name), count: 0, uses: [] };
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

  const mealsPlannedThisWeek = DAYS.reduce(
    (a, d) => a + SLOTS.reduce((b, s) => b + (plan[d]?.[s]?.length || 0), 0), 0
  );
  const shoppingItemCount = shoppingItems.length + shoppingExtras.length;

  const todayNutrition = (() => {
    const totals = { protein: 0, carbs: 0, fibre: 0 };
    let tracked = 0, planned = 0;
    SLOTS.forEach(slot => {
      (plan[todayName]?.[slot] || []).forEach(name => {
        planned += 1;
        const recipe = recipes.find(r => r.name === name);
        if (recipe?.nutrition) {
          tracked += 1;
          totals.protein += recipe.nutrition.protein;
          totals.carbs += recipe.nutrition.carbs;
          totals.fibre += recipe.nutrition.fibre;
        }
      });
    });
    return { ...totals, tracked, planned };
  })();

  // --- Week page ---------------------------------------------------------------
  const WeekPage = (
    <div className="space-y-3">
      <div className="flex gap-2">
        <StatCard icon={CalendarDays} label="This week" value={mealsPlannedThisWeek} sub="meals planned" />
        <StatCard icon={ChefHat} label="Recipes" value={recipes.length} sub="saved" />
        <StatCard icon={ShoppingCart} label="Shopping" value={shoppingItemCount} sub="items" />
      </div>

      <div className="bg-white dark:bg-[#252525] rounded-2xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Today's targets</span>
          </div>
          {todayNutrition.planned > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{todayNutrition.tracked}/{todayNutrition.planned} meals tracked</span>
          )}
        </div>
        <div className="space-y-2.5">
          <MacroBar label="Protein" actual={todayNutrition.protein} range={parseRange(PROTEIN_TARGET)} targetLabel={PROTEIN_TARGET} />
          <MacroBar
            label="Carbs" actual={todayNutrition.carbs}
            range={todayName === 'Sunday' ? null : parseRange(CARB_TARGETS[todayName])}
            targetLabel={todayName === 'Sunday' ? 'scaled' : CARB_TARGETS[todayName]}
          />
          <MacroBar label="Fibre" actual={todayNutrition.fibre} range={parseRange(FIBRE_TARGET)} targetLabel={FIBRE_TARGET} />
        </div>
        {todayName === 'Sunday' && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2.5">{CARB_TARGETS.Sunday}</p>
        )}
        {todayNutrition.planned > 0 && todayNutrition.tracked < todayNutrition.planned && (
          <p className="text-[11px] text-amber-600 mt-2.5">
            {todayNutrition.planned - todayNutrition.tracked} meal{todayNutrition.planned - todayNutrition.tracked === 1 ? '' : 's'} today {todayNutrition.planned - todayNutrition.tracked === 1 ? "isn't" : "aren't"} tracked — totals above are a floor, not the full day.
          </p>
        )}
        {PRE_WORKOUT_FUEL[todayName] && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-2.5 border-t border-gray-100 dark:border-white/10 mt-2.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">Pre-workout: </span>{PRE_WORKOUT_FUEL[todayName]}
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-[#252525] rounded-2xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Weekly plan</span>
          <button onClick={clearWeek}
            className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/10 px-2.5 py-1 rounded-lg active:bg-gray-200 dark:bg-white/10">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 ${day === todayName ? 'bg-green-50 dark:bg-green-500/10' : 'bg-gray-50 dark:bg-white/5'}`}
                >
                  <span className={`text-xs w-20 text-left flex-shrink-0 ${day === todayName ? 'font-bold text-green-700' : 'text-gray-500 dark:text-gray-400'}`}>
                    {day}{day === todayName ? ' •' : ''}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">{plannedCount} planned</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                  <div className="bg-white dark:bg-[#252525] p-3 space-y-2.5 border border-t-0 border-gray-100 dark:border-white/10 rounded-b-xl">
                    {SLOTS.map(slot => {
                      const meta = SLOT_META[slot];
                      const Icon = meta.icon;
                      const assignedNames = dayPlan[slot];
                      const available = recipes.filter(r => !assignedNames.includes(r.name));
                      return (
                        <div key={slot} className="flex items-start gap-2">
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-1.5 ${meta.text}`} />
                          <div className="w-20 flex-shrink-0 mt-1">
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">{meta.label}</div>
                            <div className="flex items-center gap-0.5 -ml-0.5">
                              <Clock className="w-2.5 h-2.5 text-gray-300 dark:text-gray-600" />
                              <input
                                type="time"
                                value={getMealTime(day, slot)}
                                onChange={e => setMealTime(day, slot, e.target.value)}
                                className="bg-transparent text-[9px] text-gray-400 dark:text-gray-500 outline-none w-[42px]"
                                aria-label={`Time for ${meta.label} on ${day}`}
                              />
                            </div>
                            <div className="flex items-center gap-0.5 -ml-0.5">
                              <input
                                type="number" inputMode="numeric" min="5" step="5"
                                value={getMealDuration(day, slot)}
                                onChange={e => setMealDuration(day, slot, e.target.value)}
                                className="bg-transparent text-[9px] text-gray-400 dark:text-gray-500 outline-none w-[22px]"
                                aria-label={`Duration for ${meta.label} on ${day}, in minutes`}
                              />
                              <span className="text-[8px] text-gray-300 dark:text-gray-600">min</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                            {assignedNames.length === 0 && available.length === 0 && (
                              <span className="text-[11px] text-gray-300 dark:text-gray-600 py-1">No recipes yet</span>
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
                                  className="appearance-none bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 rounded-full pl-2.5 pr-6 py-1 text-[11px] outline-none"
                                  aria-label={`Add to ${day} ${meta.label}`}
                                >
                                  <option value="" disabled>+ Add</option>
                                  {available.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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

      <CollapsibleCard
        title="Recipes"
        badge={`${recipes.length}`}
        actions={
          <button onClick={() => (builderOpen ? resetBuilder() : setBuilderOpen(true))}
            className="flex items-center gap-1 text-[11px] font-medium text-green-600 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-lg active:bg-green-100">
            {builderOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {builderOpen ? 'Cancel' : 'New'}
          </button>
        }
      >
        {builderOpen && (
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 mb-3 space-y-2">
            {editingRecipeId && (
              <div className="text-[11px] font-medium text-green-700 bg-green-50 dark:bg-green-500/10 rounded-lg px-2.5 py-1.5 flex items-center gap-1">
                <Pencil className="w-3 h-3" /> Editing recipe
              </div>
            )}
            <input
              value={builder.name}
              onChange={e => setBuilder(p => ({ ...p, name: e.target.value }))}
              placeholder="Recipe name"
              className="w-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500"
            />

            <div className="flex bg-gray-200/60 dark:bg-white/10 rounded-lg p-0.5">
              {[['list', 'Paste a list'], ['single', 'One at a time']].map(([mode, label]) => (
                <button key={mode}
                  onClick={() => setBuilder(p => ({ ...p, mode }))}
                  className={`flex-1 text-[11px] font-medium py-1.5 rounded-md ${
                    builder.mode === mode ? 'bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'
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
                  className="w-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 resize-none"
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
                  className="flex-1 min-w-0 bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500"
                />
                <button onClick={addDraftIngredient}
                  className="bg-gray-900 text-white rounded-lg px-3 flex-shrink-0 active:bg-gray-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {builder.ingredients.length > 0 && (
              builder.advanced ? (
                <div className="space-y-1.5">
                  {builder.ingredients.map((ing, i) => {
                    const db = findDbIngredient(ing.name);
                    const contribution = db && ing.quantity ? {
                      protein: Math.round(db.protein * ing.quantity / 100),
                      carbs: Math.round(db.carbs * ing.quantity / 100),
                      fibre: Math.round(db.fibre * ing.quantity / 100),
                    } : null;
                    return (
                      <div key={i} className="flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 rounded-lg px-2 py-1.5">
                        <span className="text-[11px] text-green-800 font-medium flex-1 min-w-0 truncate">{ing.name}</span>
                        <input
                          type="number" inputMode="numeric" min="0" placeholder="qty"
                          value={ing.quantity ?? ''}
                          onChange={e => setBuilderIngredientQuantity(i, e.target.value)}
                          className="w-14 bg-white dark:bg-[#252525] border border-green-200 rounded-md text-center text-[11px] py-1 outline-none focus:border-green-500"
                        />
                        <span className="text-[10px] text-green-700 flex-shrink-0">g</span>
                        {contribution ? (
                          <span className="text-[9px] text-green-600 flex-shrink-0 tabular-nums">P{contribution.protein}·C{contribution.carbs}·F{contribution.fibre}</span>
                        ) : db ? (
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 flex-shrink-0">in DB</span>
                        ) : (
                          <button onClick={() => quickAddDbIngredient(ing.name)} className="text-[9px] text-gray-400 dark:text-gray-500 underline flex-shrink-0">
                            not in DB
                          </button>
                        )}
                        <button onClick={() => removeBuilderIngredient(i)} aria-label={`Remove ${ing.name}`} className="text-green-400 active:text-red-500 flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {builder.ingredients.map((ing, i) => (
                    <span key={i} className="text-[11px] bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                      {ing.name}{ing.quantity ? ` · ${ing.quantity}g` : ''}
                      <button onClick={() => removeBuilderIngredient(i)} aria-label={`Remove ${ing.name}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )
            )}

            {/* A single button, not a label wrapping a button — a <button> is a
                labelable element, so a wrapping <label> forwards the click and
                fires the toggle twice, flipping it straight back. */}
            <button
              type="button"
              onClick={() => setBuilder(p => ({ ...p, advanced: !p.advanced }))}
              className="flex items-center gap-2 py-1 select-none"
            >
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                builder.advanced ? 'bg-green-600 border-green-600' : 'border-gray-300 dark:border-white/20 bg-white dark:bg-[#252525]'
              }`}>
                {builder.advanced && <Check className="w-3.5 h-3.5 text-white" />}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-300">Advanced nutrition (quantities &amp; macros)</span>
            </button>

            {builder.advanced && !builder.nutritionEnabled && (() => {
              const computed = computeIngredientsNutrition(builder.ingredients);
              return computed ? (
                <div className="text-[11px] text-green-700 bg-green-50 dark:bg-green-500/10 rounded-lg px-2.5 py-1.5">
                  Auto-calculated from ingredient quantities: <span className="font-semibold">P{computed.protein} · C{computed.carbs} · F{computed.fibre}</span>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Give an ingredient above a quantity (and match it in the database) to auto-calculate nutrition — or tick the override to type a total yourself.
                </p>
              );
            })()}

            {builder.advanced && (
              <button
                type="button"
                onClick={() => setBuilder(p => ({ ...p, nutritionEnabled: !p.nutritionEnabled }))}
                className="flex items-center gap-2 py-1 select-none"
              >
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                  builder.nutritionEnabled ? 'bg-green-600 border-green-600' : 'border-gray-300 dark:border-white/20 bg-white dark:bg-[#252525]'
                }`}>
                  {builder.nutritionEnabled && <Check className="w-3.5 h-3.5 text-white" />}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-300">Set a whole-recipe nutrition override</span>
              </button>
            )}

            {builder.advanced && builder.nutritionEnabled && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 text-center">Protein (g)</div>
                  <input
                    type="number" inputMode="numeric" min="0" placeholder="0"
                    value={builder.protein}
                    onChange={e => setBuilder(p => ({ ...p, protein: e.target.value }))}
                    className="w-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-2 text-sm text-center outline-none focus:border-green-500"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 text-center">Carbs (g)</div>
                  <input
                    type="number" inputMode="numeric" min="0" placeholder="0"
                    value={builder.carbs}
                    onChange={e => setBuilder(p => ({ ...p, carbs: e.target.value }))}
                    className="w-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-2 text-sm text-center outline-none focus:border-green-500"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 text-center">Fibre (g)</div>
                  <input
                    type="number" inputMode="numeric" min="0" placeholder="0"
                    value={builder.fibre}
                    onChange={e => setBuilder(p => ({ ...p, fibre: e.target.value }))}
                    className="w-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-2 text-sm text-center outline-none focus:border-green-500"
                  />
                </div>
              </div>
            )}

            <textarea
              value={builder.notes}
              onChange={e => setBuilder(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes / instructions (optional)"
              rows={2}
              className="w-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500 resize-none"
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
              <div key={r.id} className="border border-gray-200 dark:border-white/10 rounded-xl p-3">
                <button onClick={() => setExpandedRecipeId(expanded ? null : r.id)} className="w-full flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.nutrition && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700">
                        P{r.nutrition.protein}·C{r.nutrition.carbs}·F{r.nutrition.fibre}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{r.ingredients.length} ingredients</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                <div className="flex flex-wrap gap-1">
                  {(expanded ? r.ingredients : r.ingredients.slice(0, 6)).map((ing, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                      {ing.name}{ing.quantity ? ` · ${ing.quantity}g` : ''}
                    </span>
                  ))}
                  {!expanded && r.ingredients.length > 6 && (
                    <span className="text-[10px] px-2 py-0.5 text-gray-400 dark:text-gray-500">+{r.ingredients.length - 6} more</span>
                  )}
                </div>
                <div className={`grid transition-[grid-template-rows] duration-250 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
                      {r.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 whitespace-pre-line">{r.notes}</p>}
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
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No recipes yet — create one above.</p>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Ingredient database"
        icon={Database}
        iconColor="text-green-600"
        badge={`${ingredientDb.length}`}
        defaultOpen={false}
        actions={
          <button onClick={() => (dbBuilderOpen ? resetDbBuilder() : setDbBuilderOpen(true))}
            className="flex items-center gap-1 text-[11px] font-medium text-green-600 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-lg active:bg-green-100">
            {dbBuilderOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {dbBuilderOpen ? 'Cancel' : 'New'}
          </button>
        }
      >
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
          Per-100g macros, reused across every recipe — give an ingredient here a match and a quantity in any recipe and its nutrition calculates automatically.
        </p>

        {dbBuilderOpen && (
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 mb-3 space-y-2">
            <input
              value={dbBuilder.name}
              onChange={e => setDbBuilder(p => ({ ...p, name: e.target.value }))}
              placeholder="Ingredient name"
              className="w-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 text-center">Protein /100g</div>
                <input
                  type="number" inputMode="numeric" min="0" placeholder="0"
                  value={dbBuilder.protein}
                  onChange={e => setDbBuilder(p => ({ ...p, protein: e.target.value }))}
                  className="w-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-2 text-sm text-center outline-none focus:border-green-500"
                />
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 text-center">Carbs /100g</div>
                <input
                  type="number" inputMode="numeric" min="0" placeholder="0"
                  value={dbBuilder.carbs}
                  onChange={e => setDbBuilder(p => ({ ...p, carbs: e.target.value }))}
                  className="w-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-2 text-sm text-center outline-none focus:border-green-500"
                />
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 text-center">Fibre /100g</div>
                <input
                  type="number" inputMode="numeric" min="0" placeholder="0"
                  value={dbBuilder.fibre}
                  onChange={e => setDbBuilder(p => ({ ...p, fibre: e.target.value }))}
                  className="w-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-2 text-sm text-center outline-none focus:border-green-500"
                />
              </div>
            </div>
            <button onClick={saveDbIngredient}
              disabled={!dbBuilder.name.trim()}
              className="w-full h-10 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40 active:bg-green-700">
              {editingDbId ? 'Save changes' : 'Add ingredient'}
            </button>
          </div>
        )}

        <div className="max-h-64 overflow-y-auto space-y-1">
          {[...ingredientDb].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
            <div key={item.id} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-800 dark:text-gray-200 flex-1 min-w-0 truncate">{item.name}</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">P{item.protein}·C{item.carbs}·F{item.fibre}</span>
              <button onClick={() => startEditDbIngredient(item)} className="text-gray-300 dark:text-gray-600 active:text-green-600 flex-shrink-0">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteDbIngredient(item.id)} className="text-gray-300 dark:text-gray-600 active:text-red-500 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {ingredientDb.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No ingredients yet — add one above.</p>
          )}
        </div>
      </CollapsibleCard>
    </div>
  );

  // --- Shopping page -------------------------------------------------------------
  const ShoppingPage = (
    <div className="space-y-3">
      <div className="flex gap-2">
        <StatCard icon={ShoppingCart} label="From recipes" value={shoppingItems.length} />
        <StatCard icon={Plus} label="Extra items" value={shoppingExtras.length} />
      </div>

      <div className="bg-white dark:bg-[#252525] rounded-2xl border border-gray-200 dark:border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">From this week's plan</span>
          {(Object.values(shoppingChecked).some(Boolean) || shoppingExtras.some(e => e.checked)) && (
            <button onClick={clearAllChecks} className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/10 px-2.5 py-1 rounded-lg active:bg-gray-200 dark:bg-white/10">
              Clear checks
            </button>
          )}
        </div>
        {shoppingItems.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
            Nothing yet — assign recipes to days in Week and their ingredients show up here.
          </p>
        ) : (
          <div className="space-y-1">
            {shoppingItems.map(item => {
              const checked = !!shoppingChecked[item.key];
              const expanded = expandedIngredient === `shop::${item.key}`;
              return (
                <div key={item.key} className="bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleChecked(item.key)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                        checked ? 'bg-green-600 border-green-600 animate-success-pulse' : 'border-gray-300 dark:border-white/20 bg-white dark:bg-[#252525]'
                      }`}
                      aria-label={checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
                    >
                      {checked && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                    <span className={`text-sm flex-1 min-w-0 truncate ${checked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                      {item.name}
                    </span>
                    <button
                      onClick={() => setExpandedIngredient(expanded ? null : `shop::${item.key}`)}
                      className="flex items-center gap-1 flex-shrink-0"
                    >
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-full px-2 py-0.5">
                        {item.count} meal{item.count === 1 ? '' : 's'}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <div className="mt-1.5 pl-7 flex flex-wrap gap-1">
                        {item.uses.map((u, i) => (
                          <span key={i} className="text-[10px] text-gray-500 dark:text-gray-400 bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-full px-2 py-0.5">
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

      <div className="bg-white dark:bg-[#252525] rounded-2xl border border-gray-200 dark:border-white/10 p-4">
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm block mb-3">Other items</span>
        <div className="flex gap-2 mb-3">
          <input
            value={extraInput}
            onChange={e => setExtraInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExtra()}
            placeholder="e.g. Paper towels"
            className="flex-1 min-w-0 bg-gray-100 dark:bg-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:bg-white dark:bg-[#252525] focus:ring-2 focus:ring-green-500"
          />
          <button onClick={addExtra} className="bg-gray-900 text-white rounded-xl px-4 flex-shrink-0 active:bg-gray-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {shoppingExtras.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">Nothing added manually yet.</p>
        ) : (
          <div className="space-y-1">
            {shoppingExtras.map(e => (
              <div key={e.id} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                <button
                  onClick={() => toggleExtra(e.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                    e.checked ? 'bg-green-600 border-green-600 animate-success-pulse' : 'border-gray-300 dark:border-white/20 bg-white dark:bg-[#252525]'
                  }`}
                  aria-label={e.checked ? `Uncheck ${e.name}` : `Check ${e.name}`}
                >
                  {e.checked && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className={`text-sm flex-1 min-w-0 truncate ${e.checked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                  {e.name}
                </span>
                <button onClick={() => deleteExtra(e.id)} className="text-gray-300 dark:text-gray-600 active:text-red-500 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const SUB_TABS = [
    { id: 'week', label: 'Week', icon: CalendarDays },
    { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
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
    );
  }

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-toast-in ${
          toast.isError ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex bg-gray-200/60 dark:bg-white/10 rounded-lg p-0.5">
          {SUB_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSubTab(id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium ${
                subTab === id ? 'bg-white dark:bg-[#252525] text-green-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
        <button
          onClick={refreshFromRemote}
          disabled={isRefreshing}
          aria-label="Refresh data"
          className="text-gray-400 dark:text-gray-500 active:text-gray-600 dark:text-gray-300 disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loadError && (
        <div className="mb-3 bg-red-50 dark:bg-red-500/10 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {subTab === 'week' && WeekPage}
      {subTab === 'shopping' && ShoppingPage}
    </div>
  );
}
