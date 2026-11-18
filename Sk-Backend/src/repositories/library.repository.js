import { query } from '../config/db.js';

// Todas las queries filtran por id_usuario: cada usuario solo ve y toca su biblioteca.
// Las funciones que reciben "db" se usan dentro de una transacción (db = client).

// Datos de la biblioteca + datos de la canción (de la caché)
const SELECT_ITEM = `
  SELECT b.deezer_id, b.estado, b.puntuacion, b.agregada_en, b.actualizada_en,
         c.titulo, c.artista_nombre, c.album_titulo, c.portada_url,
         c.duracion_seg, c.genero, c.fecha_lanzamiento
  FROM biblioteca b
  JOIN cancion c ON c.deezer_id = b.deezer_id`;

// ORDER BY no acepta parámetros ($1), así que la columna sale de esta lista fija
// y nunca de lo que manda el usuario.
const ORDER_COLUMNS = {
  fecha: 'b.agregada_en',
  puntuacion: 'b.puntuacion',
};

// Cada filtro es opcional: si llega NULL, la condición "$x IS NULL OR ..." se cumple siempre.
export const findAllByUser = async (idUsuario, { estado, puntuacionMin, orden, direccion }) => {
  const column = ORDER_COLUMNS[orden] || ORDER_COLUMNS.fecha;
  const direction = direccion === 'asc' ? 'ASC' : 'DESC';

  const { rows } = await query(
    `${SELECT_ITEM}
     WHERE b.id_usuario = $1
       AND ($2::varchar IS NULL OR b.estado = $2)
       AND ($3::int IS NULL OR b.puntuacion >= $3)
     ORDER BY ${column} ${direction} NULLS LAST, b.agregada_en DESC`,
    [idUsuario, estado ?? null, puntuacionMin ?? null],
  );
  return rows;
};

export const findOne = async (idUsuario, deezerId) => {
  const { rows } = await query(`${SELECT_ITEM} WHERE b.id_usuario = $1 AND b.deezer_id = $2`, [
    idUsuario,
    deezerId,
  ]);
  return rows[0] || null;
};

// FOR UPDATE bloquea la fila hasta el COMMIT, así dos pedidos al mismo tiempo
// no se pisan (por ejemplo, al armar el detalle "escuchando -> escuchado").
export const findForUpdate = async (db, idUsuario, deezerId) => {
  const { rows } = await db.query(
    `SELECT estado, puntuacion FROM biblioteca
     WHERE id_usuario = $1 AND deezer_id = $2
     FOR UPDATE`,
    [idUsuario, deezerId],
  );
  return rows[0] || null;
};

export const create = async (db, idUsuario, deezerId, estado) => {
  await db.query('INSERT INTO biblioteca (id_usuario, deezer_id, estado) VALUES ($1, $2, $3)', [
    idUsuario,
    deezerId,
    estado,
  ]);
};

// Devuelve cuántas filas borró (0 = no estaba en la biblioteca de ese usuario)
export const remove = async (db, idUsuario, deezerId) => {
  const { rowCount } = await db.query('DELETE FROM biblioteca WHERE id_usuario = $1 AND deezer_id = $2', [
    idUsuario,
    deezerId,
  ]);
  return rowCount;
};

export const updateStatus = async (db, idUsuario, deezerId, estado) => {
  await db.query(
    `UPDATE biblioteca SET estado = $3, actualizada_en = NOW()
     WHERE id_usuario = $1 AND deezer_id = $2`,
    [idUsuario, deezerId, estado],
  );
};

export const updateRating = async (db, idUsuario, deezerId, puntuacion) => {
  await db.query(
    `UPDATE biblioteca SET puntuacion = $3, actualizada_en = NOW()
     WHERE id_usuario = $1 AND deezer_id = $2`,
    [idUsuario, deezerId, puntuacion],
  );
};
