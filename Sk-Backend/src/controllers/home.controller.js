import * as homeService from '../services/home.service.js';

// GET /api/home/resumen (protegida): el usuario sale del token
export const resumen = async (req, res) => {
  res.json(await homeService.getResumen(req.user.id));
};

// GET /api/home/destacados
export const destacados = async (req, res) => {
  res.json(await homeService.getDestacados());
};
