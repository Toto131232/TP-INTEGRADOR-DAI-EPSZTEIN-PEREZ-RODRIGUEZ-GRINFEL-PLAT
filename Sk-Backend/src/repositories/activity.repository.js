import { query } from '../config/db.js';

// Se llama siempre con el client de la transacción de la operación principal:
// si la operación falla, el registro de actividad también se deshace.
// idPlaylist solo lo mandan las acciones de playlists.
export const create = async (db, { idUsuario, tipo, deezerId = null, idPlaylist = null, detalle = null }) => {
  await db.query(
    'INSERT INTO actividad (id_usuario, tipo, deezer_id, id_playlist, detalle) VALUES ($1, $2, $3, $4, $5)',
    [idUsuario, tipo, deezerId, idPlaylist, detalle],
  );
};

// LEFT JOIN: si la canción ya no está en la caché, la actividad se muestra igual
export const findRecentByUser = async (idUsuario, limit) => {
  const { rows } = await query(
    `SELECT a.id_actividad, a.tipo, a.deezer_id, a.id_playlist, a.detalle, a.creada_en,
            c.titulo, c.artista_nombre, c.portada_url
     FROM actividad a
     LEFT JOIN cancion c ON c.deezer_id = a.deezer_id
     WHERE a.id_usuario = $1
     ORDER BY a.creada_en DESC, a.id_actividad DESC
     LIMIT $2`,
    [idUsuario, limit],
  );
  return rows;
};
