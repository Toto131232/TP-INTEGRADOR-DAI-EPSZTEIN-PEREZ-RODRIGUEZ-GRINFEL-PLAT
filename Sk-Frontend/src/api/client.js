import { Platform } from 'react-native';

// URL del backend. Se puede sobreescribir con EXPO_PUBLIC_API_URL en Sk-Frontend/.env.local
// (ej: EXPO_PUBLIC_API_URL=http://192.168.0.10:3000/api para un celular físico).
// En el emulador de Android, "localhost" es el propio emulador: la PC es 10.0.2.2.
const DEFAULT_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000/api'
  : 'http://localhost:3000/api';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

// Token JWT de la sesión actual. Lo setea el AuthContext al loguearse / restaurar la sesión.
let authToken = null;
let onUnauthorized = null;

export const setAuthToken = (token) => {
  authToken = token;
};

// Se llama cuando el backend responde 401 con un token (vencido o usuario borrado)
export const setOnUnauthorized = (fn) => {
  onUnauthorized = fn;
};

const request = async (method, path, { params = {}, body, signal } = {}) => {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${API_URL}${path}${query ? `?${query}` : ''}`;

  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('No se pudo conectar con el servidor');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && authToken) onUnauthorized?.();
    const error = new Error(data?.error || `Error ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
};

export const apiGet = (path, params = {}, { signal } = {}) =>
  request('GET', path, { params, signal });

export const apiPost = (path, body, { signal } = {}) =>
  request('POST', path, { body, signal });

export const apiPut = (path, body, { signal } = {}) =>
  request('PUT', path, { body, signal });

export const apiPatch = (path, body, { signal } = {}) =>
  request('PATCH', path, { body, signal });

export const apiDelete = (path, { signal } = {}) =>
  request('DELETE', path, { signal });
