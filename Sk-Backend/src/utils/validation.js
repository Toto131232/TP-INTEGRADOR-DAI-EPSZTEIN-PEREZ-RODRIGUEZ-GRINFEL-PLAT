import { HttpError } from './http-error.js';

// Máximo de una columna INT / SERIAL de PostgreSQL (por ejemplo id_resena)
export const MAX_INT = 2147483647;

// Convierte un id que llega como texto (params, query) o número (body) en un entero
// positivo. Si no es válido corta el pedido con 400.
export const parseId = (value, name, max = Number.MAX_SAFE_INTEGER) => {
  const text = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : '';
  const number = Number(text);
  if (!/^\d+$/.test(text) || number < 1 || number > max) {
    const range = max === Number.MAX_SAFE_INTEGER ? 'positivo' : `entre 1 y ${max}`;
    throw new HttpError(400, `${name} debe ser un número entero ${range}`);
  }
  return number;
};
