import * as profileService from '../services/profile.service.js';
import { HttpError } from '../utils/http-error.js';

// Largo máximo de cada campo
const MAX_NOMBRE = 100;
const MAX_BIO = 300;
const MAX_AVATAR_URL = 500;
const MAX_GENERO = 60;
const MAX_GENEROS = 10;

// GET /api/profile  (protegida: el usuario sale del token)
export const getPerfil = async (req, res) => {
  const perfil = await profileService.getPerfil(req.user.id);
  res.json(perfil);
};

// PATCH /api/profile  body: { nombre?, bio?, avatarUrl?, generos? }
export const updatePerfil = async (req, res) => {
  const { nombre, bio, avatarUrl, generos } = req.body ?? {};

  // Validaciones básicas: solo validamos los campos que llegaron
  if (nombre !== undefined) {
    if (typeof nombre !== 'string' || nombre.trim().length === 0) {
      throw new HttpError(400, 'nombre no puede estar vacío');
    }
    if (nombre.trim().length > MAX_NOMBRE) {
      throw new HttpError(400, `nombre puede tener hasta ${MAX_NOMBRE} caracteres`);
    }
  }

  if (bio !== undefined && bio !== null) {
    if (typeof bio !== 'string') {
      throw new HttpError(400, 'bio debe ser texto');
    }
    if (bio.trim().length > MAX_BIO) {
      throw new HttpError(400, `bio puede tener hasta ${MAX_BIO} caracteres`);
    }
  }

  if (avatarUrl !== undefined && avatarUrl !== null) {
    if (typeof avatarUrl !== 'string') {
      throw new HttpError(400, 'avatarUrl debe ser texto');
    }
    if (avatarUrl.trim().length > MAX_AVATAR_URL) {
      throw new HttpError(400, `avatarUrl puede tener hasta ${MAX_AVATAR_URL} caracteres`);
    }
  }

  if (generos !== undefined) {
    if (!Array.isArray(generos)) {
      throw new HttpError(400, 'generos debe ser un arreglo');
    }
    if (generos.length > MAX_GENEROS) {
      throw new HttpError(400, `Se pueden guardar hasta ${MAX_GENEROS} géneros`);
    }
    for (const g of generos) {
      if (typeof g !== 'string' || g.trim().length === 0 || g.trim().length > MAX_GENERO) {
        throw new HttpError(400, `Cada género debe ser texto de 1 a ${MAX_GENERO} caracteres`);
      }
    }
  }

  const usuario = await profileService.updatePerfil(req.user.id, {
    nombre: nombre?.trim(),
    bio: bio?.trim() ?? null,
    avatarUrl: avatarUrl?.trim() ?? null,
    generos: generos?.map((g) => g.trim()),
  });

  res.json({ usuario });
};
