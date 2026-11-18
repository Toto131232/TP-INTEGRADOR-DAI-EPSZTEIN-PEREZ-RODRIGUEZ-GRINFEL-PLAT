import { query } from '../config/db.js';

// Fila de `cancion` (+ puntuación de la biblioteca) -> mismo formato que devuelve el buscador.
const rowToSong = (row) => ({
  deezerId: Number(row.deezer_id),
  titulo: row.titulo,
  artista: {
    deezerId: row.artista_deezer_id !== null ? Number(row.artista_deezer_id) : null,
    nombre: row.artista_nombre,
  },
  album: {
    deezerId: null,
    titulo: row.album_titulo,
    portadaUrl: row.portada_url,
  },
  duracionSeg: row.duracion_seg,
  puntuacion: row.puntuacion,
});

export const findUsuario = async (idUsuario) => {
  const { rows } = await query(
    `SELECT id_usuario, username, nombre, avatar_url
       FROM usuario
      WHERE id_usuario = $1`,
    [idUsuario],
  );
  const u = rows[0];
  if (!u) return null;
  return { id: u.id_usuario, username: u.username, nombre: u.nombre, avatarUrl: u.avatar_url };
};

export const getStats = async (idUsuario) => {
  // 'favorito' se cuenta como escuchado por compatibilidad con bases sin la migración 01.
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*) FROM biblioteca WHERE id_usuario = $1)::int                              AS en_biblioteca,
       (SELECT COUNT(*) FROM biblioteca WHERE id_usuario = $1 AND puntuacion IS NOT NULL)::int  AS calificadas,
       (SELECT COUNT(*) FROM biblioteca WHERE id_usuario = $1
                                          AND estado IN ('escuchado', 'favorito'))::int         AS escuchadas,
       (SELECT COUNT(*) FROM resena     WHERE id_usuario = $1)::int                              AS resenas`,
    [idUsuario],
  );
  const s = rows[0];
  return {
    enBiblioteca: s.en_biblioteca,
    calificadas: s.calificadas,
    escuchadas: s.escuchadas,
    resenas: s.resenas,
  };
};

// "Favoritos" = canciones mejor puntuadas (4 o 5 estrellas).
export const getFavoritos = async (idUsuario, limit) => {
  const { rows } = await query(
    `SELECT c.deezer_id, c.titulo, c.artista_deezer_id, c.artista_nombre,
            c.album_titulo, c.portada_url, c.duracion_seg, b.puntuacion
       FROM biblioteca b
       JOIN cancion c ON c.deezer_id = b.deezer_id
      WHERE b.id_usuario = $1
        AND b.puntuacion >= 4
      ORDER BY b.puntuacion DESC, b.actualizada_en DESC
      LIMIT $2`,
    [idUsuario, limit],
  );
  return rows.map(rowToSong);
};
