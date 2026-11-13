// Recent scans (most recent first), persisted locally. Stores the full product so it can be reopened offline.
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fs:history:v1';
const MAX_ITEMS = 50;
const Ctx = createContext(null);

export function ScanHistoryProvider({ children }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => raw && setHistory(JSON.parse(raw))).catch(() => {});
  }, []);

  const persist = (next) => {
    setHistory(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  const addScan = (product) => {
    const entry = { ...product, scannedAt: Date.now() };
    persist([entry, ...history.filter((h) => h.id !== product.id)].slice(0, MAX_ITEMS));
  };
  const clearHistory = () => persist([]);

  return <Ctx.Provider value={{ history, addScan, clearHistory }}>{children}</Ctx.Provider>;
}

export const useScanHistory = () => useContext(Ctx);
