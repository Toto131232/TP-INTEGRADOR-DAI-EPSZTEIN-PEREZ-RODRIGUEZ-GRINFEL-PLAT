import { verifyToken } from '../services/auth.service.js';
import { HttpError } from '../utils/http-error.js';
import * as usuarioRepository from '../repositories/usuario.repository.js';

// Protege rutas: exige "Authorization: Bearer <token>" y deja el usuario en req.user
export const requireAuth = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Falta el token de autenticación');
  }

  const payload = verifyToken(token);
  const id = Number(payload.sub);

  // El token puede seguir vigente aunque el usuario se haya borrado: sin este control
  // las escrituras fallaban con 500 (llave foránea) y las lecturas devolvían listas vacías.
  if (!(await usuarioRepository.findById(id))) {
    throw new HttpError(401, 'El usuario del token ya no existe');
  }

  req.user = { id, username: payload.username };
  next();
};
