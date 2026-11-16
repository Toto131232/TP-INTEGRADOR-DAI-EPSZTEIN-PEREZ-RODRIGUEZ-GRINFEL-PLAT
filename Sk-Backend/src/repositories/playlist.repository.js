import { query } from '../config/db.js';

// Las queries sobre la tabla playlist filtran por id_playlist Y por id_usuario:
// aunque alguien saltee el control del service, nunca se lee ni se toca la playlist de otro.
// Las queries sobre playlist_cancion se usan después de ese control (ver playlist.service).
// Las funciones que reciben "db" se usan dentro de una transacción (db = client).

const PLAYLIST_FIELDS = 'id_playlist, nombre, descripcion, portada_url, creada_en';

// Datos de la canción en la playlist + datos de la canción (de la caché)
const SELECT_SONG = `
  SELECT pc.posicion, pc.agregada_en, c.deezer_id, c.titulo, c.artista_nombre,
         c.album_titulo, c.portada_url, c.duracion_seg
  FROM playlist_cancion pc
  JOIN cancion c ON c.deezer_id = pc.deezer_id`;

// ---------- Playlists ----------

// LEFT JOIN para que las playlists vacías también aparezcan (con 0 canciones)
export const findAllByUser = async (idUsuario) => {
  const { rows } = await query(
    `SELECT p.id_playlist, p.nombre, p.descripcion, p.portada_url, p.creada_en,
            COUNT(pc.deezer_id) AS cantidad_canciones
     FROM playlist p
     LEFT JOIN playlist_cancion pc ON pc.id_playlist = p.id_playlist
     WHERE p.id_usuario = $1
     GROUP BY p.id_playlist
     ORDER BY p.creada_en DESC, p.id_playlist DESC`,
    [idUsuario],
  );
  return rows;
};

export const findByIdAndUser = async (idPlaylist, idUsuario) => {
  const { rows } = await query(
    `SELECT ${PLAYLIST_FIELDS} FROM playlist WHERE id_playlist = $1 AND id_usuario = $2`,
    [idPlaylist, idUsuario],
  );
  return rows[0] || null;
};

// FOR UPDATE bloquea la playlist hasta el COMMIT, así dos pedidos sobre la misma
// playlist no se pisan (por ejemplo, dos canciones agregadas a la vez no reciben la misma posición).
export const findForUpdate = async (db, idPlaylist, idUsuario) => {
  const { rows } = await db.query(
    `SELECT ${PLAYLIST_FIELDS} FROM playlist
     WHERE id_playlist = $1 AND id_usuario = $2
     FOR UPDATE`,
    [idPlaylist, idUsuario],
  );
  return rows[0] || null;
};

export const create = async (db, idUsuario, { nombre, descripcion, portada_url }) => {
  const { rows } = await db.query(
    `INSERT INTO playlist (id_usuario, nombre, descripcion, portada_url)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PLAYLIST_FIELDS}`,
    [idUsuario, nombre, descripcion, portada_url],
  );
  return rows[0];
};

export const update = async (db, idPlaylist, idUsuario, { nombre, descripcion, portada_url }) => {
  const { rows } = await db.query(
    `UPDATE playlist SET nombre = $3, descripcion = $4, portada_url = $5
     WHERE id_playlist = $1 AND id_usuario = $2
     RETURNING ${PLAYLIST_FIELDS}`,
    [idPlaylist, idUsuario, nombre, descripcion, portada_url],
  );
  return rows[0] || null;
};

// Sus filas de playlist_cancion se borran solas (ON DELETE CASCADE)
export const remove = async (db, idPlaylist, idUsuario) => {
  const { rowCount } = await db.query('DELETE FROM playlist WHERE id_playlist = $1 AND id_usuario = $2', [
    idPlaylist,
    idUsuario,
  ]);
  return rowCount;
};

// ---------- Canciones de una playlist ----------

export const findSongs = async (idPlaylist) => {
  const { rows } = await query(`${SELECT_SONG} WHERE pc.id_playlist = $1 ORDER BY pc.posicion`, [idPlaylist]);
  return rows;
};

export const findSong = async (idPlaylist, deezerId) => {
  const { rows } = await query(`${SELECT_SONG} WHERE pc.id_playlist = $1 AND pc.deezer_id = $2`, [
    idPlaylist,
    deezerId,
  ]);
  return rows[0] || null;
};

export const hasSong = async (idPlaylist, deezerId) => {
  const { rowCount } = await query('SELECT 1 FROM playlist_cancion WHERE id_playlist = $1 AND deezer_id = $2', [
    idPlaylist,
    deezerId,
  ]);
  return rowCount > 0;
};

// La próxima posición libre: la última + 1 (o 1 si la playlist está vacía)
export const nextPosition = async (db, idPlaylist) => {
  const { rows } = await db.query(
    'SELECT COALESCE(MAX(posicion), 0) + 1 AS posicion FROM playlist_cancion WHERE id_playlist = $1',
    [idPlaylist],
  );
  return rows[0].posicion;
};

export const addSong = async (db, idPlaylist, deezerId, posicion) => {
  await db.query('INSERT INTO playlist_cancion (id_playlist, deezer_id, posicion) VALUES ($1, $2, $3)', [
    idPlaylist,
    deezerId,
    posicion,
  ]);
};

// Devuelve la posición que tenía la canción, o null si no estaba en la playlist
export const removeSong = async (db, idPlaylist, deezerId) => {
  const { rows } = await db.query(
    'DELETE FROM playlist_cancion WHERE id_playlist = $1 AND deezer_id = $2 RETURNING posicion',
    [idPlaylist, deezerId],
  );
  return rows[0]?.posicion ?? null;
};

// Las canciones que estaban después de la quitada suben un lugar: las posiciones quedan 1, 2, 3... sin huecos
export const closeGap = async (db, idPlaylist, posicion) => {
  await db.query('UPDATE playlist_cancion SET posicion = posicion - 1 WHERE id_playlist = $1 AND posicion > $2', [
    idPlaylist,
    posicion,
  ]);
};
