import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/auth/register   body: { username, email, password, nombre? }
// Crea una cuenta nueva y ya devuelve el token, así el usuario queda logueado.
//   201 -> se creó la cuenta: { token, usuario }
//   400 -> falta un dato o es inválido (username, email, contraseña de 8 a 72 caracteres con un número, nombre)
//   409 -> el username o el email ya están en uso
router.post('/register', authController.register);

// POST /api/auth/login   body: { username, password }   (username puede ser el email)
// Inicia sesión y devuelve el token para usar en las rutas protegidas.
//   200 -> login correcto: { token, usuario }
//   400 -> falta username o password
//   401 -> el usuario no existe o la contraseña es incorrecta (mismo mensaje en los dos casos)
router.post('/login', authController.login);

// GET /api/auth/username-disponible?username=lucas
// Dice si un username está libre (lo usa el formulario de registro mientras escribís).
//   200 -> { disponible: true | false }
//   400 -> el username no tiene un formato válido
router.get('/username-disponible', authController.usernameDisponible);

// GET /api/auth/me   (con token)
// Devuelve los datos del usuario logueado.
//   200 -> { usuario }
//   401 -> sin token, token inválido/vencido o el usuario ya no existe
//   404 -> el usuario no se encontró
router.get('/me', requireAuth, authController.me);

export default router;
