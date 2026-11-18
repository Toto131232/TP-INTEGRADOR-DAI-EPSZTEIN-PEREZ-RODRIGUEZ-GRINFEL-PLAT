import * as homeService from '../services/home.service.js';
import { parseId, MAX_INT } from '../utils/validation.js';

// GET /api/home/resumen?usuarioId=1
// TODO: cuando esté el login, sacar el usuario del token (req.user.id) en vez del query.
export const resumen = async (req, res) => {
  // MAX_INT: id_usuario es INT; un número más grande hacía fallar la query con 500
  const id = parseId(req.query.usuarioId, 'usuarioId', MAX_INT);
  res.json(await homeService.getResumen(id));
};

// GET /api/home/destacados
export const destacados = async (req, res) => {
  res.json(await homeService.getDestacados());
};
