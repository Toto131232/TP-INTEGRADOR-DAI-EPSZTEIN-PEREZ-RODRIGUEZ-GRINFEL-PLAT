import { Router } from 'express';
import * as homeController from '../controllers/home.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/home/resumen   (con token)
// Datos personales de la pantalla Home: saludo, "Tu semana" y favoritos.
//   200 -> { usuario, stats, favoritos }
//   401 -> sin token, token inválido/vencido o el usuario ya no existe
//   404 -> el usuario no se encontró
router.get('/resumen', requireAuth, homeController.resumen);

// GET /api/home/destacados   (pública)
// "Destacado de hoy": las 10 canciones más escuchadas en Deezer.
//   200 -> { data: [canciones] }
//   502 -> Deezer no respondió o devolvió un error
router.get('/destacados', homeController.destacados);

export default router;
