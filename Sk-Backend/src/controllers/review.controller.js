import * as reviewService from '../services/review.service.js';
import { HttpError } from '../utils/http-error.js';
import { parseId, MAX_INT } from '../utils/validation.js';

const MAX_TEXTO = 1000;

// Devuelve el texto sin espacios de más, o corta con 400 si está vacío o es muy largo
const checkTexto = (texto) => {
  if (typeof texto !== 'string' || texto.trim().length === 0) {
    throw new HttpError(400, 'texto es obligatorio y no puede estar vacío');
  }
  if (texto.trim().length > MAX_TEXTO) {
    throw new HttpError(400, `texto puede tener como máximo ${MAX_TEXTO} caracteres`);
  }
  return texto.trim();
};

// GET /api/songs/:deezerId/reviews   (pública, sin token)
export const listBySong = async (req, res) => {
  const deezerId = parseId(req.params.deezerId, 'deezer_id');
  const resenas = await reviewService.listBySong(deezerId);
  res.json({ total: resenas.length, resenas });
};

// POST /api/songs/:deezerId/reviews   body: { texto }
export const create = async (req, res) => {
  const deezerId = parseId(req.params.deezerId, 'deezer_id');
  const texto = checkTexto(req.body?.texto);

  const resena = await reviewService.create(req.user.id, deezerId, texto);
  res.status(201).json({ resena });
};

// PUT /api/reviews/:idResena   body: { texto }
export const update = async (req, res) => {
  const idResena = parseId(req.params.idResena, 'id_resena', MAX_INT);
  const texto = checkTexto(req.body?.texto);

  const resena = await reviewService.update(req.user.id, idResena, texto);
  res.json({ resena });
};

// DELETE /api/reviews/:idResena
export const remove = async (req, res) => {
  const idResena = parseId(req.params.idResena, 'id_resena', MAX_INT);
  await reviewService.remove(req.user.id, idResena);
  res.status(204).end();
};
