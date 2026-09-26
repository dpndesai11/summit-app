// Eat's data model: storage keys, defaults and the read-time normalizers for
// the weekly meal plan and ingredient lists. Split out of MealsSection.jsx so
// both it and useMealsData.js share the same shapes.

export const STORAGE_KEYS = {
  recipes: 'summit_recipes',
  weeklyMealPlan: 'summit_weekly_meal_plan',
  mealTimes: 'summit_meal_times',
  shoppingChecked: 'summit_shopping_checked',
  shoppingExtras: 'summit_shopping_extras',
  ingredients: 'summit_ingredients',
};

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SLOTS = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'];

export const emptyDay = () => ({ breakfast: [], snack1: [], lunch: [], snack2: [], dinner: [] });
export const EMPTY_PLAN = DAYS.reduce((acc, d) => ({ ...acc, [d]: emptyDay() }), {});

export const DEFAULT_RECIPES = [
  { id: 1, name: 'Overnight Oats', ingredients: ['Rolled oats', 'Milk', 'Chia seeds', 'Honey', 'Berries'], notes: 'Mix and refrigerate overnight.' },
  { id: 2, name: 'Chicken Stir-fry', ingredients: ['Chicken breast', 'Broccoli', 'Bell pepper', 'Soy sauce', 'Garlic', 'Rice'], notes: '' },
];

export const DEFAULT_INGREDIENTS = [
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

export const normalizePlan = (raw) => DAYS.reduce((acc, d) => ({ ...acc, [d]: normalizeDay(raw?.[d]) }), {});

export const normalizeIngredientName = (s) => s.trim().replace(/\s+/g, ' ');
export const ingredientKey = (s) => normalizeIngredientName(s).toLowerCase();

const normalizeIngredient = (ing) => (
  typeof ing === 'string'
    ? { name: normalizeIngredientName(ing), quantity: null }
    : { name: normalizeIngredientName(ing.name || ''), quantity: ing.quantity || null }
);
export const normalizeRecipeIngredients = (ingredients) => (Array.isArray(ingredients) ? ingredients.map(normalizeIngredient) : []);
