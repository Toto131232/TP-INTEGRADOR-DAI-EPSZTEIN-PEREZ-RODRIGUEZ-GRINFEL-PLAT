import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client';

// Biblioteca del usuario logueado. Todas devuelven la fila de la biblioteca:
// { deezer_id, estado, puntuacion, me_gusta, ... }

// GET /api/library/:deezerId -> la canción en mi biblioteca, o null si no está
export const getLibraryItem = async (deezerId, { signal } = {}) => {
  try {
    const { cancion } = await apiGet(`/library/${deezerId}`, {}, { signal });
    return cancion;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
};

// POST /api/library
export const addToLibrary = async (deezerId, estado = 'quiero_escuchar') =>
  (await apiPost('/library', { deezer_id: deezerId, estado })).cancion;

// DELETE /api/library/:deezerId
export const removeFromLibrary = (deezerId) => apiDelete(`/library/${deezerId}`);

// PATCH /api/library/:deezerId/status
export const setEstado = async (deezerId, estado) =>
  (await apiPatch(`/library/${deezerId}/status`, { estado })).cancion;

// PUT /api/library/:deezerId/rating
export const setRating = async (deezerId, puntuacion) =>
  (await apiPut(`/library/${deezerId}/rating`, { puntuacion })).cancion;

// PUT /api/library/:deezerId/like  (si no estaba en la biblioteca, la agrega)
export const setLike = async (deezerId, meGusta) =>
  (await apiPut(`/library/${deezerId}/like`, { me_gusta: meGusta })).cancion;
