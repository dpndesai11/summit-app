import { useEffect, useState } from 'react';
import { dbGet, dbSet, dbRefresh } from '@summit/core/db';
import { STORAGE_KEYS, normalizeHabit, logsFor, toISO } from './lib/model';

// All of Habits' persisted state and its load/save/refresh plumbing — same
// shape as Fitness's useWorkoutData / Eat's useMealsData.
export default function useHabitsData() {
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState({});
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
    const [h, hl] = await Promise.all([
      loadData(STORAGE_KEYS.habits, []),
      loadData(STORAGE_KEYS.habitLogs, {}),
    ]);
    setHabits((Array.isArray(h) ? h : []).map(normalizeHabit));
    setHabitLogs(hl && typeof hl === 'object' ? hl : {});
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

  const updateHabits = (next) => { setHabits(next); saveToStorage(STORAGE_KEYS.habits, next); };
  const updateHabitLogs = (next) => { setHabitLogs(next); saveToStorage(STORAGE_KEYS.habitLogs, next); };

  const addHabit = (name, color) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateHabits([...habits, { id: Date.now(), name: trimmed, color, createdAt: toISO(new Date()), archived: false }]);
    showToast('Habit added');
  };

  const archiveHabit = (id) => {
    updateHabits(habits.map(h => (h.id === id ? { ...h, archived: true } : h)));
  };

  const deleteHabit = (id) => {
    updateHabits(habits.filter(h => h.id !== id));
    const next = {};
    Object.keys(habitLogs).forEach(iso => { next[iso] = logsFor(habitLogs, iso).filter(hId => hId !== id); });
    updateHabitLogs(next);
  };

  // Toggles a habit done for a given date (today, from the checklist).
  const toggleHabitForDate = (habitId, iso) => {
    const current = logsFor(habitLogs, iso);
    const next = current.includes(habitId) ? current.filter(id => id !== habitId) : [...current, habitId];
    updateHabitLogs({ ...habitLogs, [iso]: next });
  };

  return {
    habits, habitLogs,
    toast, isLoading, loadError, isRefreshing,
    refreshFromRemote,
    addHabit, archiveHabit, deleteHabit, toggleHabitForDate,
  };
}
