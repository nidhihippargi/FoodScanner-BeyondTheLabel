import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = '@fs/preferences';
const HISTORY_KEY = '@fs/history';
export const DEFAULT_PREFS = { allergens: [], diets: [], conditions: [] };
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFS);
  const [history, setHistory] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, h] = await Promise.all([AsyncStorage.getItem(PREFS_KEY), AsyncStorage.getItem(HISTORY_KEY)]);
        if (p) setPreferences({ ...DEFAULT_PREFS, ...JSON.parse(p) });
        if (h) setHistory(JSON.parse(h));
      } catch (e) { /* start fresh */ }
      setHydrated(true);
    })();
  }, []);

  const persist = (key, value) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});

  const togglePref = useCallback((group, value) => {
    setPreferences((prev) => {
      const list = prev[group] || [];
      const next = { ...prev, [group]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] };
      persist(PREFS_KEY, next);
      return next;
    });
  }, []);

  const addHistory = useCallback((entry) => {
    setHistory((prev) => {
      const next = [{ ...entry, createdAt: new Date().toISOString() }, ...prev.filter((x) => x.scanId !== entry.scanId)].slice(0, 50);
      persist(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => { setHistory([]); persist(HISTORY_KEY, []); }, []);

  const value = useMemo(() => ({ preferences, togglePref, history, addHistory, clearHistory, hydrated }), [preferences, togglePref, history, addHistory, clearHistory, hydrated]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};
