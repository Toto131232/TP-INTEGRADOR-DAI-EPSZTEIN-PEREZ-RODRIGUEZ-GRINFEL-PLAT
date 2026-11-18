import * as authService from '../services/auth.service.js';
import { HttpError } from '../utils/http-error.js';

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

// POST /api/auth/login  { username, password }  (username puede ser el email)
export const login = async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    throw new HttpError(400, 'username y password son obligatorios');
  }

  const result = await authService.login(username.trim(), password);
  res.json(result);
};

// GET /api/auth/username-disponible?username=lucas -> { disponible }
export const usernameDisponible = async (req, res) => {
  const { username } = req.query;
  if (typeof username !== 'string' || !USERNAME_RE.test(username.trim())) {
    throw new HttpError(400, 'El username debe tener entre 3 y 50 caracteres (letras, números, _ o .)');
  }
  res.json({ disponible: await authService.isUsernameDisponible(username.trim()) });
};

// POST /api/auth/register
export const register = async (req, res) => {
  const { username, email, password, nombre } = req.body ?? {};

  if (!isNonEmptyString(username) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
    throw new HttpError(400, 'username, email y password son obligatorios');
  }
  if (!USERNAME_RE.test(username.trim())) {
    throw new HttpError(400, 'El username debe tener entre 3 y 50 caracteres (letras, números, _ o .)');
  }
  if (email.trim().length > 150 || !EMAIL_RE.test(email.trim())) {
    throw new HttpError(400, 'Email inválido');
  }
  // bcrypt solo usa los primeros 72 bytes
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    throw new HttpError(400, 'La contraseña debe tener entre 8 y 72 caracteres');
  }
  if (!/\d/.test(password)) {
    throw new HttpError(400, 'La contraseña debe tener al menos un número');
  }
  if (nombre != null && (typeof nombre !== 'string' || nombre.length > 100)) {
    throw new HttpError(400, 'El nombre debe ser texto de hasta 100 caracteres');
  }

  const result = await authService.register({
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password,
    nombre: nombre?.trim() || null,
  });
  res.status(201).json(result);
};

// GET /api/auth/me (protegida)
export const me = async (req, res) => {
  const usuario = await authService.getUsuarioById(req.user.id);
  res.json({ usuario });
};
