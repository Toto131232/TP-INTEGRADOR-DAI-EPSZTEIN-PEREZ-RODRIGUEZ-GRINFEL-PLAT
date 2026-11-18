import { API_URL } from './client';
import { DEMO_USUARIO_ID } from '../config';

// Mientras no haya sistema de login en el front, usamos el DEMO_USUARIO_ID
// y un token placeholder. Las rutas de /profile exigen requireAuth en el back,
// así que se envía el header de todas formas; si el token no es válido el back
// devolverá 401.
// TODO: reemplazar DEMO_TOKEN por el token real cuando esté el auth.
const DEMO_TOKEN = process.env.EXPO_PUBLIC_DEMO_TOKEN || '';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(DEMO_TOKEN ? { Authorization: `Bearer ${DEMO_TOKEN}` } : {}),
});

const handleResponse = async (res) => {
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Error ${res.status}`);
  return body;
};

// GET /api/profile
export const getPerfil = async ({ signal } = {}) => {
  let res;
  try {
    res = await fetch(`${API_URL}/profile`, {
      headers: authHeaders(),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('No se pudo conectar con el servidor');
  }
  return handleResponse(res);
};

// PUT /api/profile
export const updatePerfil = async (datos) => {
  let res;
  try {
    res = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(datos),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  return handleResponse(res);
};
