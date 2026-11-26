import { Router } from 'express';
import * as profileController from '../controllers/profile.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las rutas de perfil requieren estar logueado

// GET /api/profile
// Ojo: esta ruta nunca se ejecuta, porque index.js ya define GET /profile antes (hace lo mismo).
router.get('/', requireAuth, profileController.getPerfil);

// PATCH /api/profile   body: { nombre?, bio?, avatarUrl?, generos? }
// Edita el perfil del usuario logueado (el username no se puede cambiar).
//   200 -> { usuario }   (los datos ya actualizados)
//   400 -> algún campo es inválido (nombre vacío o muy largo, bio > 300, avatarUrl > 500, más de 10 géneros...)
//   401 -> sin token, token inválido/vencido o el usuario ya no existe
router.patch('/', requireAuth, profileController.updatePerfil);

export default router;
