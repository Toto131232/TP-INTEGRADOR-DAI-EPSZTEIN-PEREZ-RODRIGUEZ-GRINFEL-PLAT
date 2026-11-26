import { query } from '../config/db.js';

// Datos públicos del usuario para la pantalla de perfil
export const findPerfil = async (idUsuario) => {
  const { rows } = await query(
    `SELECT id_usuario, username, nombre, avatar_url, bio, creado_en
       FROM usuario
      WHERE id_usuario = $1`,
    [idUsuario],
  );
  return rows[0] || null;
};

// Estadísticas para la cabecera del perfil
export const getStats = async (idUsuario) => {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM biblioteca WHERE id_usuario = $1)             AS en_biblioteca,
       (SELECT COUNT(*)::int FROM biblioteca WHERE id_usuario = $1
                                               AND puntuacion >= 4)             AS favoritos,
       (SELECT COUNT(*)::int FROM resena     WHERE id_usuario = $1)             AS resenas`,
    [idUsuario],
  );
  return rows[0];
};

// Géneros preferidos del usuario (tabla preferencia_genero)
export const getGeneros = async (idUsuario) => {
  const { rows } = await query(
    `SELECT genero FROM preferencia_genero WHERE id_usuario = $1 ORDER BY genero`,
    [idUsuario],
  );
  return rows.map((r) => r.genero);
};

// Canciones favoritas (puntuación >= 4), con datos de la caché
export const getFavoritos = async (idUsuario, limit) => {
  const { rows } = await query(
    `SELECT c.deezer_id, c.titulo, c.artista_nombre, c.portada_url, b.puntuacion
       FROM biblioteca b
       JOIN cancion c ON c.deezer_id = b.deezer_id
      WHERE b.id_usuario = $1
        AND b.puntuacion >= 4
      ORDER BY b.puntuacion DESC, b.actualizada_en DESC
      LIMIT $2`,
    [idUsuario, limit],
  );
  return rows;
};

// Reseñas propias con la puntuación de la biblioteca (puede ser NULL si no puntuó)
export const getResenas = async (idUsuario, limit) => {
  const { rows } = await query(
    `SELECT r.id_resena, r.texto, r.creada_en,
            c.deezer_id, c.titulo, c.artista_nombre, c.portada_url,
            b.puntuacion
       FROM resena r
       JOIN cancion c ON c.deezer_id = r.deezer_id
       LEFT JOIN biblioteca b ON b.id_usuario = r.id_usuario AND b.deezer_id = r.deezer_id
      WHERE r.id_usuario = $1
      ORDER BY r.creada_en DESC
      LIMIT $2`,
    [idUsuario, limit],
  );
  return rows;
};

// Actualiza los datos editables del usuario (nunca toca username ni password_hash)
export const updatePerfil = async (idUsuario, { nombre, bio, avatarUrl }) => {
  const { rows } = await query(
    `UPDATE usuario
        SET nombre     = $2,
            bio        = $3,
            avatar_url = $4
      WHERE id_usuario = $1
  RETURNING id_usuario, username, nombre, avatar_url, bio, creado_en`,
    [idUsuario, nombre ?? null, bio ?? null, avatarUrl ?? null],
  );
  return rows[0];
};

// Reemplaza todos los géneros del usuario de una sola vez
// (borra los viejos e inserta los nuevos dentro de una misma transacción)
export const replaceGeneros = async (db, idUsuario, generos) => {
  await db.query('DELETE FROM preferencia_genero WHERE id_usuario = $1', [idUsuario]);
  if (generos.length === 0) return;

  // Arma los placeholders: ($1,$2), ($1,$3), ...
  const values = generos.map((g, i) => `($1, $${i + 2})`).join(', ');
  await db.query(
    `INSERT INTO preferencia_genero (id_usuario, genero) VALUES ${values}`,
    [idUsuario, ...generos],
  );
};
