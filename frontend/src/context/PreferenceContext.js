// User dietary preferences, persisted locally with AsyncStorage.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fs:preferences:v1';
export const DEFAULT_PREFS = {
  vegetarian: false,
  vegan: false,
  glutenFree: false,
  lowSugar: false,
  allergens: { peanuts: false, soy: false, dairy: false, treeNuts: false },
};

const Ctx = createContext(null);

export function PreferenceProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = useCallback((next) => {
    setPrefs(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setPref = (key, value) => save({ ...prefs, [key]: value });
  const setAllergen = (key, value) => save({ ...prefs, allergens: { ...prefs.allergens, [key]: value } });
  const activeCount = [prefs.vegetarian, prefs.vegan, prefs.glutenFree, prefs.lowSugar, ...Object.values(prefs.allergens)].filter(Boolean).length;

  return <Ctx.Provider value={{ prefs, loaded, setPref, setAllergen, activeCount }}>{children}</Ctx.Provider>;
}

export const usePreferences = () => useContext(Ctx);
