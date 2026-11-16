import { apiGet } from './client';

// GET /api/home/resumen -> { usuario, stats, favoritos }
export const getResumen = (usuarioId, { signal } = {}) =>
  apiGet('/home/resumen', { usuarioId }, { signal });

// GET /api/home/destacados -> { data: Cancion[] }
export const getDestacados = ({ signal } = {}) =>
  apiGet('/home/destacados', {}, { signal });
