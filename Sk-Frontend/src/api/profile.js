import { apiGet, apiPatch } from './client';

// GET /api/profile -> { usuario, stats, generos, favoritos, resenas }
export const getPerfil = ({ signal } = {}) =>
  apiGet('/profile', {}, { signal });

// PATCH /api/profile -> { usuario }
// Campos editables: nombre, bio, avatarUrl, generos (array de strings)
export const updatePerfil = (datos) =>
  apiPatch('/profile', datos);
