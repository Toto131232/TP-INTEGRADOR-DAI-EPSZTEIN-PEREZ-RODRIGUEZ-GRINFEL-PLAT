import { query } from '../config/db.js';

const REVIEW_FIELDS = 'id_resena, id_usuario, deezer_id, texto, creada_en, editada_en';

// Pública: reseñas de una canción con el autor. Solo datos públicos del usuario (nunca email).
export const findBySong = async (deezerId) => {
  const { rows } = await query(
    `SELECT r.id_resena, r.deezer_id, r.texto, r.creada_en, r.editada_en,
            u.id_usuario, u.username, u.avatar_url
     FROM resena r
     JOIN usuario u ON u.id_usuario = r.id_usuario
     WHERE r.deezer_id = $1
     ORDER BY r.creada_en DESC`,
    [deezerId],
  );
  return rows;
};

export const findByUserAndSong = async (idUsuario, deezerId) => {
  const { rows } = await query(`SELECT ${REVIEW_FIELDS} FROM resena WHERE id_usuario = $1 AND deezer_id = $2`, [
    idUsuario,
    deezerId,
  ]);
  return rows[0] || null;
};

// Busca por id sin filtrar por usuario: la usamos para saber si la reseña existe (404)
// o si es de otra persona (403). Las reseñas son públicas, así que no se filtra nada privado.
export const findById = async (db, idResena) => {
  const { rows } = await db.query(`SELECT ${REVIEW_FIELDS} FROM resena WHERE id_resena = $1 FOR UPDATE`, [
    idResena,
  ]);
  return rows[0] || null;
};

export const create = async (db, idUsuario, deezerId, texto) => {
  const { rows } = await db.query(
    `INSERT INTO resena (id_usuario, deezer_id, texto)
     VALUES ($1, $2, $3)
     RETURNING ${REVIEW_FIELDS}`,
    [idUsuario, deezerId, texto],
  );
  return rows[0];
};

// Editar y borrar filtran también por id_usuario: aunque alguien saltee el control
// del service, la query nunca toca la reseña de otro usuario.
export const update = async (db, idResena, idUsuario, texto) => {
  const { rows } = await db.query(
    `UPDATE resena SET texto = $3, editada_en = NOW()
     WHERE id_resena = $1 AND id_usuario = $2
     RETURNING ${REVIEW_FIELDS}`,
    [idResena, idUsuario, texto],
  );
  return rows[0] || null;
};

export const remove = async (db, idResena, idUsuario) => {
  const { rowCount } = await db.query('DELETE FROM resena WHERE id_resena = $1 AND id_usuario = $2', [
    idResena,
    idUsuario,
  ]);
  return rowCount;
};
