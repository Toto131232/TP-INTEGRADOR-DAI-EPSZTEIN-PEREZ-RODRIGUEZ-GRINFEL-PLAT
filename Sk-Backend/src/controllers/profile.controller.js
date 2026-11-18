import * as profileService from '../services/profile.service.js';
import { HttpError } from '../utils/http-error.js';

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,50}$/;
const isString = (v) => typeof v === 'string';
const isNonEmptyString = (v) => isString(v) && v.trim().length > 0;

// GET /api/profile
// Devuelve el perfil completo del usuario logueado.
export const getPerfil = async (req, res) => {
  const perfil = await profileService.getPerfil(req.user.id);
  res.json(perfil);
};

// PUT /api/profile
// Actualiza nombre, username, bio y géneros del usuario logueado.
export const updatePerfil = async (req, res) => {
  const { nombre, username, bio, generos } = req.body ?? {};

  // username es obligatorio.
  if (!isNonEmptyString(username)) {
    throw new HttpError(400, 'username es obligatorio');
  }
  if (!USERNAME_RE.test(username.trim())) {
    throw new HttpError(400, 'El username debe tener entre 3 y 50 caracteres (letras, números, _ o .)');
  }

  // nombre es opcional (puede ser null para borrarlo).
  if (nombre != null && (!isString(nombre) || nombre.trim().length === 0)) {
    throw new HttpError(400, 'nombre debe ser texto no vacío o null');
  }
  if (nombre != null && nombre.trim().length > 100) {
    throw new HttpError(400, 'nombre puede tener como máximo 100 caracteres');
  }

  // bio es opcional.
  if (bio != null && (!isString(bio) || bio.trim().length === 0)) {
    throw new HttpError(400, 'bio debe ser texto no vacío o null');
  }
  if (bio != null && bio.trim().length > 300) {
    throw new HttpError(400, 'bio puede tener como máximo 300 caracteres');
  }

  // generos es un array de strings (puede ser vacío).
  if (!Array.isArray(generos)) {
    throw new HttpError(400, 'generos debe ser un array');
  }
  if (generos.some((g) => !isNonEmptyString(g) || g.trim().length > 60)) {
    throw new HttpError(400, 'Cada género debe ser texto no vacío de hasta 60 caracteres');
  }
  // Límite razonable para evitar abusos.
  if (generos.length > 20) {
    throw new HttpError(400, 'Se pueden guardar hasta 20 géneros');
  }

  const perfil = await profileService.updatePerfil(req.user.id, {
    nombre: nombre?.trim() || null,
    username: username.trim(),
    bio: bio?.trim() || null,
    generos: [...new Set(generos.map((g) => g.trim()))], // sin duplicados
  });

  res.json(perfil);
};
