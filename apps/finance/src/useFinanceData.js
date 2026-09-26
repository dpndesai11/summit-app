import { useEffect, useState } from 'react';
import { dbGet, dbSet, dbRefresh } from '@summit/core/db';
import { STORAGE_KEYS, normalizeBill, toISO } from './lib/model';

// All of Finance's persisted state and its load/save/refresh plumbing — same
// shape as Fitness's useWorkoutData / Eat's useMealsData / Habits' useHabitsData.
export default function useFinanceData() {
  const [bills, setBills] = useState([]);
  const [billPayments, setBillPayments] = useState({});
  const [netWorthSnapshots, setNetWorthSnapshots] = useState([]);
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
    const [b, bp, nw] = await Promise.all([
      loadData(STORAGE_KEYS.bills, []),
      loadData(STORAGE_KEYS.billPayments, {}),
      loadData(STORAGE_KEYS.netWorthSnapshots, []),
    ]);
    setBills((Array.isArray(b) ? b : []).map(normalizeBill));
    setBillPayments(bp && typeof bp === 'object' ? bp : {});
    setNetWorthSnapshots(Array.isArray(nw) ? nw : []);
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

  const updateBills = (next) => { setBills(next); saveToStorage(STORAGE_KEYS.bills, next); };
  const updateBillPayments = (next) => { setBillPayments(next); saveToStorage(STORAGE_KEYS.billPayments, next); };
  const updateNetWorthSnapshots = (next) => { setNetWorthSnapshots(next); saveToStorage(STORAGE_KEYS.netWorthSnapshots, next); };

  const addBill = (bill) => {
    updateBills([...bills, normalizeBill({ id: Date.now(), ...bill })]);
    showToast('Bill added');
  };

  const deleteBill = (id) => {
    updateBills(bills.filter(b => b.id !== id));
  };

  const togglePaid = (billId, monthKeyValue) => {
    const monthPayments = billPayments[monthKeyValue] || {};
    const next = { ...monthPayments, [billId]: !monthPayments[billId] };
    if (!next[billId]) delete next[billId];
    updateBillPayments({ ...billPayments, [monthKeyValue]: next });
  };

  const addSnapshot = (accounts) => {
    updateNetWorthSnapshots([...netWorthSnapshots, { id: Date.now(), date: toISO(new Date()), accounts }]);
    showToast('Snapshot added');
  };

  const deleteSnapshot = (id) => {
    updateNetWorthSnapshots(netWorthSnapshots.filter(s => s.id !== id));
  };

  return {
    bills, billPayments, netWorthSnapshots,
    toast, isLoading, loadError, isRefreshing,
    refreshFromRemote,
    addBill, deleteBill, togglePaid, addSnapshot, deleteSnapshot,
  };
}
