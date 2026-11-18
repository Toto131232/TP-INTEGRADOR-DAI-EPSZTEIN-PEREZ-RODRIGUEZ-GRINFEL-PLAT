import { query } from '../config/db.js';

// Campos públicos del usuario (nunca password_hash ni email).
const PUBLIC_FIELDS = 'id_usuario, username, nombre, avatar_url, bio, creado_en';

// ─── Lectura ───────────────────────────────────────────────────────────────────

export const findById = async (idUsuario) => {
  const { rows } = await query(
    `SELECT ${PUBLIC_FIELDS} FROM usuario WHERE id_usuario = $1`,
    [idUsuario],
  );
  return rows[0] || null;
};

// Contadores del perfil: en biblioteca, favoritos (puntuacion >= 4) y reseñas.
export const getCounters = async (idUsuario) => {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*) FROM biblioteca WHERE id_usuario = $1)::int                             AS en_biblioteca,
       (SELECT COUNT(*) FROM biblioteca WHERE id_usuario = $1 AND puntuacion >= 4)::int         AS favoritos,
       (SELECT COUNT(*) FROM resena     WHERE id_usuario = $1)::int                             AS resenas`,
    [idUsuario],
  );
  const s = rows[0];
  return {
    enBiblioteca: s.en_biblioteca,
    favoritos: s.favoritos,
    resenas: s.resenas,
  };
};

// Géneros elegidos por el usuario en su perfil.
export const getGeneros = async (idUsuario) => {
  const { rows } = await query(
    'SELECT genero FROM preferencia_genero WHERE id_usuario = $1 ORDER BY genero',
    [idUsuario],
  );
  return rows.map((r) => r.genero);
};

// Favoritos = canciones con puntuacion >= 4, ordenadas por mejor puntuación.
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
  return rows.map((row) => ({
    deezerId: Number(row.deezer_id),
    titulo: row.titulo,
    artista: {
      deezerId: row.artista_deezer_id !== null ? Number(row.artista_deezer_id) : null,
      nombre: row.artista_nombre,
    },
    album: {
      titulo: row.album_titulo,
      portadaUrl: row.portada_url,
    },
    duracionSeg: row.duracion_seg,
    puntuacion: row.puntuacion,
  }));
};

// Reseñas del usuario con datos de la canción correspondiente.
export const getResenas = async (idUsuario) => {
  const { rows } = await query(
    `SELECT r.id_resena, r.deezer_id, r.texto, r.creada_en, r.editada_en,
            c.titulo AS cancion_titulo, c.artista_nombre, c.portada_url,
            b.puntuacion
       FROM resena r
       JOIN cancion c ON c.deezer_id = r.deezer_id
       LEFT JOIN biblioteca b ON b.id_usuario = r.id_usuario AND b.deezer_id = r.deezer_id
      WHERE r.id_usuario = $1
      ORDER BY r.creada_en DESC`,
    [idUsuario],
  );
  return rows.map((row) => ({
    idResena: row.id_resena,
    deezerId: Number(row.deezer_id),
    texto: row.texto,
    creadaEn: row.creada_en,
    editadaEn: row.editada_en,
    cancion: {
      titulo: row.cancion_titulo,
      artistaNombre: row.artista_nombre,
      portadaUrl: row.portada_url,
    },
    puntuacion: row.puntuacion,
  }));
};

// ─── Escritura ─────────────────────────────────────────────────────────────────

// Verifica si el username ya está en uso por OTRO usuario (no el propio).
export const isUsernameTaken = async (username, idUsuario) => {
  const { rows } = await query(
    'SELECT 1 FROM usuario WHERE username = $1 AND id_usuario != $2',
    [username, idUsuario],
  );
  return rows.length > 0;
};

// Actualiza los campos editables. Recibe el client de la transacción.
export const updateUsuario = async (db, idUsuario, { nombre, username, bio }) => {
  const { rows } = await db.query(
    `UPDATE usuario
        SET nombre    = $2,
            username  = $3,
            bio       = $4
      WHERE id_usuario = $1
  RETURNING ${PUBLIC_FIELDS}`,
    [idUsuario, nombre ?? null, username, bio ?? null],
  );
  return rows[0] || null;
};

// Reemplaza todos los géneros del usuario de una vez (borra los anteriores y guarda los nuevos).
// Recibe el client de la transacción para garantizar atomicidad con updateUsuario.
export const replaceGeneros = async (db, idUsuario, generos) => {
  await db.query('DELETE FROM preferencia_genero WHERE id_usuario = $1', [idUsuario]);

  if (generos.length === 0) return;

  // Construye los placeholders: ($1,$2), ($3,$4), …
  const values = [];
  const placeholders = generos.map((g) => {
    values.push(idUsuario, g);
    return `($${values.length - 1}, $${values.length})`;
  });

  await db.query(
    `INSERT INTO preferencia_genero (id_usuario, genero) VALUES ${placeholders.join(', ')}`,
    values,
  );
};
