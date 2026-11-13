import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Resolve the backend URL: env override -> Expo dev-server LAN host -> emulator default. */
function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  const host = (Constants.expoConfig && Constants.expoConfig.hostUri) || (Constants.expoGoConfig && Constants.expoGoConfig.debuggerHost);
  if (host) return `http://${host.split(':')[0]}:5000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
}
export const BASE_URL = resolveBaseUrl();

async function request(path, { method = 'GET', body, timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}/api${path}`, {
      method, signal: ctrl.signal, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (!json || json.success !== true) {
      const err = new Error((json && json.error && json.error.message) || `Server error (${res.status})`);
      err.code = (json && json.error && json.error.code) || 'SERVER_ERROR';
      throw err;
    }
    return json.data;
  } catch (e) {
    if (e.name === 'AbortError') { const t = new Error('Request timed out. Is the backend running?'); t.code = 'TIMEOUT'; throw t; }
    if (e instanceof TypeError) { const n = new Error(`Cannot reach the server at ${BASE_URL}. Check Wi-Fi and that the backend is running.`); n.code = 'NETWORK'; throw n; }
    throw e;
  } finally { clearTimeout(timer); }
}

export const scanBarcode = (barcode) => request('/scan/barcode', { method: 'POST', body: { barcode } });
export const scanOcr = (text, engineConfidence) => request('/scan/ocr', { method: 'POST', body: { text, engineConfidence } });
export const analyze = (payload) => request('/analyze', { method: 'POST', body: payload });
export const health = () => request('/health');
