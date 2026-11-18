import { apiGet, apiPost } from './client';

// POST /api/auth/login -> { token, usuario }  ("username" puede ser el email)
export const login = (username, password) =>
  apiPost('/auth/login', { username, password });

// POST /api/auth/register -> { token, usuario }
export const register = ({ username, email, password }) =>
  apiPost('/auth/register', { username, email, password });

// GET /api/auth/me -> { usuario }
export const getMe = ({ signal } = {}) => apiGet('/auth/me', {}, { signal });

// GET /api/auth/username-disponible -> { disponible }
export const checkUsername = (username, { signal } = {}) =>
  apiGet('/auth/username-disponible', { username }, { signal });
