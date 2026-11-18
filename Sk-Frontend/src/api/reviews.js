import { apiDelete, apiGet, apiPost, apiPut } from './client';

// GET /api/songs/:deezerId/reviews -> { total, resenas }  (pública)
export const listReviews = (deezerId, { signal } = {}) =>
  apiGet(`/songs/${deezerId}/reviews`, {}, { signal });

// POST /api/songs/:deezerId/reviews -> { resena }
export const createReview = (deezerId, texto) =>
  apiPost(`/songs/${deezerId}/reviews`, { texto });

// PUT /api/reviews/:idResena -> { resena }
export const updateReview = (idResena, texto) =>
  apiPut(`/reviews/${idResena}`, { texto });

// DELETE /api/reviews/:idResena
export const deleteReview = (idResena) => apiDelete(`/reviews/${idResena}`);
