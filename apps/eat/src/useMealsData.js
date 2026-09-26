import { useEffect, useState } from 'react';
import { dbGet, dbSet, dbRefresh } from '@summit/core/db';
import {
  STORAGE_KEYS, DEFAULT_RECIPES, DEFAULT_INGREDIENTS, EMPTY_PLAN,
  normalizePlan, normalizeRecipeIngredients,
} from './lib/model';

// All of Eat's persisted state and its load/save/refresh plumbing, split out
// of MealsSection.jsx so App.jsx can own the shell (loading skeleton, toast,
// refresh button, tab bar) the same way Fitness's useWorkoutData does —
// MealsSection.jsx itself is unchanged apart from reading this instead of its
// own useState calls.
export default function useMealsData() {
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

  return {
    recipes, plan, mealTimes, shoppingChecked, shoppingExtras, ingredientDb,
    toast, isLoading, loadError, isRefreshing,
    showToast, refreshFromRemote,
    updateRecipes, updatePlan, updateMealTimes, updateShoppingChecked, updateShoppingExtras, updateIngredientDb,
  };
}
