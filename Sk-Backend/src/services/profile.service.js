import { withTransaction } from '../config/db.js';
import { HttpError } from '../utils/http-error.js';
import * as profileRepository from '../repositories/profile.repository.js';

const FAVORITOS_LIMIT = 5;
const RESENAS_LIMIT = 20;

// Devuelve todos los datos que necesita la pantalla de perfil de una sola vez
export const getPerfil = async (idUsuario) => {
  const [usuario, stats, generos, favoritos, resenas] = await Promise.all([
    profileRepository.findPerfil(idUsuario),
    profileRepository.getStats(idUsuario),
    profileRepository.getGeneros(idUsuario),
    profileRepository.getFavoritos(idUsuario, FAVORITOS_LIMIT),
    profileRepository.getResenas(idUsuario, RESENAS_LIMIT),
  ]);

  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');

  return { usuario, stats, generos, favoritos, resenas };
};

// Actualiza nombre, bio, avatar_url y géneros del usuario logueado.
// username NO se puede cambiar.
export const updatePerfil = async (idUsuario, { nombre, bio, avatarUrl, generos }) => {
  let usuarioActualizado;

  await withTransaction(async (db) => {
    // Actualiza los campos del usuario
    const { rows } = await db.query(
      `UPDATE usuario
          SET nombre     = $2,
              bio        = $3,
              avatar_url = $4
        WHERE id_usuario = $1
    RETURNING id_usuario, username, nombre, avatar_url, bio, creado_en`,
      [idUsuario, nombre ?? null, bio ?? null, avatarUrl ?? null],
    );
    usuarioActualizado = rows[0];

    // Reemplaza géneros si se enviaron
    if (generos !== undefined) {
      await profileRepository.replaceGeneros(db, idUsuario, generos);
    }
  });

  return usuarioActualizado;
};
