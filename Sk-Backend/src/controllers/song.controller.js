import { HttpError } from '../middlewares/error.middleware.js';
import * as songService from '../services/song.service.js';

const MAX_QUERY_LENGTH = 100;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const parseIntParam = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isInteger(n) ? n : NaN;
};

// GET /api/songs/search?q=texto&limit=20&index=0
export const search = async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) throw new HttpError(400, 'El parámetro "q" es obligatorio');
  if (q.length > MAX_QUERY_LENGTH) {
    throw new HttpError(400, `"q" no puede superar ${MAX_QUERY_LENGTH} caracteres`);
  }

  const limit = parseIntParam(req.query.limit, DEFAULT_LIMIT);
  if (Number.isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new HttpError(400, `"limit" debe ser un entero entre 1 y ${MAX_LIMIT}`);
  }

  const index = parseIntParam(req.query.index, 0);
  if (Number.isNaN(index) || index < 0) {
    throw new HttpError(400, '"index" debe ser un entero mayor o igual a 0');
  }

  const result = await songService.searchSongs({ q, limit, index });
  res.json(result);
};
