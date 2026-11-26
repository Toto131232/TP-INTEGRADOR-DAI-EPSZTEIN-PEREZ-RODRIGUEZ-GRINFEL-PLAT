import { apiGet } from './client';

// GET /api/songs/search -> { data: Cancion[], total, nextIndex }
export const searchSongs = (q, { index = 0, limit = 20, signal } = {}) =>
  apiGet('/songs/search', { q, index, limit }, { signal });

// GET /api/songs/:deezerId -> { cancion }  (detalle con géneros, fecha y portada grande)
export const getSong = (deezerId, { signal } = {}) =>
  apiGet(`/songs/${deezerId}`, {}, { signal });
