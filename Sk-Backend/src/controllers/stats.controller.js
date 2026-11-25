import * as statsService from '../services/stats.service.js';
import { HttpError } from '../utils/http-error.js';

// GET /api/stats?periodo=mes|anio|todo
// periodo es opcional; si no llega se usa 'anio' como default (lo que muestra el Figma)
export const getStats = async (req, res) => {
  const periodo = req.query.periodo ?? 'anio';

  if (!statsService.PERIODOS_VALIDOS.includes(periodo)) {
    throw new HttpError(400, `periodo debe ser uno de: ${statsService.PERIODOS_VALIDOS.join(', ')}`);
  }

  const stats = await statsService.getStats(req.user.id, periodo);
  res.json(stats);
};
