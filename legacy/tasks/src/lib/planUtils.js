// The weekly workout plan maps each day to a LIST of template names (the
// fitness sub-app supports multiple workouts per day). Older data stored a
// single string per day ('Rest Day' meaning none) — these helpers read both
// shapes so the two apps stay compatible on the shared summit-data.json.

export const dayWorkoutList = (v) => {
  if (Array.isArray(v)) return v.filter(n => typeof n === 'string' && n && n !== 'Rest Day');
  if (typeof v === 'string' && v && v !== 'Rest Day' && v !== 'None') return [v];
  return [];
};

export const dayWorkoutLabel = (v) => {
  const list = dayWorkoutList(v);
  return list.length ? list.join(' + ') : 'Rest Day';
};
