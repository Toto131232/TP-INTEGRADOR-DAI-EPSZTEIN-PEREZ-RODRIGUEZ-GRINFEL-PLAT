import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';
import * as usuarioRepository from '../repositories/usuario.repository.js';

const SALT_ROUNDS = 10;

const signToken = (usuario) =>
  jwt.sign({ sub: String(usuario.id_usuario), username: usuario.username }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

// "identificador" puede ser el username o el email
export const login = async (identificador, password) => {
  const usuario = await usuarioRepository.findByUsernameOrEmailForLogin(identificador);

  // Mismo mensaje si el usuario no existe o la contraseña es incorrecta
  const ok = usuario && (await bcrypt.compare(password, usuario.password_hash));
  if (!ok) throw new HttpError(401, 'Credenciales inválidas');

  const { password_hash: _omit, ...publico } = usuario;
  return { token: signToken(publico), usuario: publico };
};

export const register = async ({ username, email, password, nombre }) => {
  const existentes = await usuarioRepository.findByUsernameOrEmail(username, email);
  if (existentes.some((u) => u.username === username)) {
    throw new HttpError(409, 'El nombre de usuario ya está en uso');
  }
  if (existentes.some((u) => u.email === email)) {
    throw new HttpError(409, 'El email ya está registrado');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let usuario;
  try {
    usuario = await usuarioRepository.create({ username, email, passwordHash, nombre });
  } catch (err) {
    // Dos registros simultáneos: lo frena el UNIQUE de la BD
    if (err.code === '23505') throw new HttpError(409, 'El usuario o email ya existe');
    throw err;
  }

  return { token: signToken(usuario), usuario };
};

export const isUsernameDisponible = async (username) =>
  !(await usuarioRepository.existsUsername(username));

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.jwt.secret);
  } catch {
    throw new HttpError(401, 'Token inválido o expirado');
  }
};

export const getUsuarioById = async (id) => {
  const usuario = await usuarioRepository.findById(id);
  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');
  return usuario;
};
