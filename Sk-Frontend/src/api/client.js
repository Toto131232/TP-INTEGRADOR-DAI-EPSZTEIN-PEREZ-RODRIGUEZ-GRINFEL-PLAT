import { Platform } from 'react-native';

// URL del backend. Se puede sobreescribir con EXPO_PUBLIC_API_URL en Sk-Frontend/.env.local
// (ej: EXPO_PUBLIC_API_URL=http://192.168.0.10:3000/api para un celular físico).
// En el emulador de Android, "localhost" es el propio emulador: la PC es 10.0.2.2.
const DEFAULT_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000/api'
  : 'http://localhost:3000/api';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

export const apiGet = async (path, params = {}, { signal } = {}) => {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${API_URL}${path}${query ? `?${query}` : ''}`;

  let res;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('No se pudo conectar con el servidor');
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Error ${res.status}`);
  return body;
};
