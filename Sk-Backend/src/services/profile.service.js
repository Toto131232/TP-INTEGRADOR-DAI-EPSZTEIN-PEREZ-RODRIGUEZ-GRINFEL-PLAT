import { withTransaction } from '../config/db.js';
import { HttpError } from '../utils/http-error.js';
import * as profileRepository from '../repositories/profile.repository.js';

const FAVORITOS_PERFIL_LIMIT = 8;

// GET /api/profile
// Devuelve todos los datos públicos del perfil del usuario logueado.
export const getPerfil = async (idUsuario) => {
  const [usuario, contadores, generos, favoritos, resenas] = await Promise.all([
    profileRepository.findById(idUsuario),
    profileRepository.getCounters(idUsuario),
    profileRepository.getGeneros(idUsuario),
    profileRepository.getFavoritos(idUsuario, FAVORITOS_PERFIL_LIMIT),
    profileRepository.getResenas(idUsuario),
  ]);

  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');

  return {
    usuario: {
      id: usuario.id_usuario,
      username: usuario.username,
      nombre: usuario.nombre,
      avatarUrl: usuario.avatar_url,
      bio: usuario.bio,
      creadoEn: usuario.creado_en,
    },
    contadores,
    generos,
    favoritos,
    resenas,
  };
};

// PUT /api/profile
// Actualiza nombre, username, bio y géneros del usuario logueado.
export const updatePerfil = async (idUsuario, { nombre, username, bio, generos }) => {
  // Validar que el username no esté en uso por otro usuario.
  if (await profileRepository.isUsernameTaken(username, idUsuario)) {
    throw new HttpError(409, 'El nombre de usuario ya está en uso');
  }

  // Usamos withTransaction porque tocamos dos tablas (usuario + preferencia_genero).
  try {
    await withTransaction(async (db) => {
      await profileRepository.updateUsuario(db, idUsuario, { nombre, username, bio });
      await profileRepository.replaceGeneros(db, idUsuario, generos);
    });
  } catch (err) {
    // 23505 = dos requests simultáneos eligieron el mismo username
    if (err.code === '23505') throw new HttpError(409, 'El nombre de usuario ya está en uso');
    throw err;
  }

  // Devolvemos el perfil actualizado completo.
  return getPerfil(idUsuario);
};
