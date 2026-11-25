import { Router } from 'express';
import * as profileController from '../controllers/profile.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las rutas de perfil requieren estar logueado
router.get('/', requireAuth, profileController.getPerfil);
router.patch('/', requireAuth, profileController.updatePerfil);

export default router;
