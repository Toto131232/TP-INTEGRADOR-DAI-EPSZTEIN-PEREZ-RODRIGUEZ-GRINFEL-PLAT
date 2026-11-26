import { Router } from 'express';
import * as statsController from '../controllers/stats.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/stats?periodo=mes|anio|todo   (con token; si no mandás periodo usa 'anio')
// Estadísticas del usuario: promedio de calificación, reseñas, top artistas y géneros.
//   200 -> { periodo, anio, calificacion, resenas, topArtistas, generos }
//   400 -> periodo no es 'mes', 'anio' ni 'todo'
//   401 -> sin token, token inválido/vencido o el usuario ya no existe
router.get('/', requireAuth, statsController.getStats);

export default router;
