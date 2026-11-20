import { apiDelete, apiGet, apiPatch, apiPut } from './client';

// Biblioteca del usuario logueado (todas van con token).
// Cada canción viene así: { deezer_id, estado, puntuacion, titulo, artista_nombre, portada_url, ... }

// GET /api/library?estado=&puntuacion_min=&orden=&direccion= -> { total, canciones }
// Los filtros en null no se mandan (apiGet los saltea).
export const getLibrary = ({ estado, puntuacionMin, orden, direccion } = {}, { signal } = {}) =>
  apiGet('/library', { estado, puntuacion_min: puntuacionMin, orden, direccion }, { signal });

// DELETE /api/library/:deezerId
export const removeFromLibrary = (deezerId) => apiDelete(`/library/${deezerId}`);

// PATCH /api/library/:deezerId/status
export const setEstado = async (deezerId, estado) =>
  (await apiPatch(`/library/${deezerId}/status`, { estado })).cancion;

// PUT /api/library/:deezerId/rating
export const setRating = async (deezerId, puntuacion) =>
  (await apiPut(`/library/${deezerId}/rating`, { puntuacion })).cancion;
