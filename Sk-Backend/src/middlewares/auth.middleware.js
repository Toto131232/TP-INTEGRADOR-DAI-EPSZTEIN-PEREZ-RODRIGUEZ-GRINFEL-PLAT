import { verifyToken } from '../services/auth.service.js';
import { HttpError } from '../utils/http-error.js';

// Protege rutas: exige "Authorization: Bearer <token>" y deja el usuario en req.user
export const requireAuth = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }

  const payload = verifyToken(token);
  req.user = { id: Number(payload.sub), username: payload.username };
  next();
};
