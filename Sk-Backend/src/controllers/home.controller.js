import { HttpError } from '../middlewares/error.middleware.js';
import * as homeService from '../services/home.service.js';

// GET /api/home/resumen?usuarioId=1
// TODO: cuando esté el login, sacar el usuario del token (req.user.id) en vez del query.
export const resumen = async (req, res) => {
  const id = Number(req.query.usuarioId);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, '"usuarioId" debe ser un entero positivo');
  }
  res.json(await homeService.getResumen(id));
};

// GET /api/home/destacados
export const destacados = async (req, res) => {
  res.json(await homeService.getDestacados());
};
