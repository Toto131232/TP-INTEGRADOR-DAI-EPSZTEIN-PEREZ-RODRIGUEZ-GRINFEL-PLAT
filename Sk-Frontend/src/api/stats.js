import { apiGet } from './client';

// GET /api/stats?periodo=mes|anio|todo
// -> { periodo, anio, calificacion, resenas, topArtistas, generos }
export const getStats = (periodo = 'anio', { signal } = {}) =>
  apiGet('/stats', { periodo }, { signal });
