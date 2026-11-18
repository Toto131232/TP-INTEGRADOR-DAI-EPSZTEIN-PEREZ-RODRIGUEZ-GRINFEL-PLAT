import { apiGet } from './client';

// GET /api/home/resumen -> { usuario, stats, favoritos }  (usuario logueado, va con token)
export const getResumen = ({ signal } = {}) =>
  apiGet('/home/resumen', {}, { signal });

// GET /api/home/destacados -> { data: Cancion[] }
export const getDestacados = ({ signal } = {}) =>
  apiGet('/home/destacados', {}, { signal });
