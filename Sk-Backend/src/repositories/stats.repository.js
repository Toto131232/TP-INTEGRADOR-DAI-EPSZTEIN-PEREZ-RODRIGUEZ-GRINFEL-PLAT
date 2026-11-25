import { query } from '../config/db.js';

// Calificación promedio y cantidad de canciones calificadas en un período.
// periodo: 'mes' filtra el mes actual, 'anio' filtra el año actual, cualquier otra cosa = todo.
export const getCalificacion = async (idUsuario, periodo) => {
  const filtroFecha = buildFiltroFecha(periodo, 'b.actualizada_en');

  const { rows } = await query(
    `SELECT
       ROUND(AVG(b.puntuacion)::numeric, 1)::float AS promedio,
       COUNT(*)::int                                AS cantidad
     FROM biblioteca b
     WHERE b.id_usuario = $1
       AND b.puntuacion IS NOT NULL
       ${filtroFecha}`,
    [idUsuario],
  );
  return rows[0];
};

// Cantidad de reseñas escritas en un período.
export const getResenas = async (idUsuario, periodo) => {
  const filtroFecha = buildFiltroFecha(periodo, 'r.creada_en');

  const { rows } = await query(
    `SELECT COUNT(*)::int AS total
     FROM resena r
     WHERE r.id_usuario = $1
       ${filtroFecha}`,
    [idUsuario],
  );
  return rows[0];
};

// Top 5 artistas por cantidad de canciones en biblioteca en un período.
// Opción A aprobada: usa biblioteca en vez de historial_reproduccion.
export const getTopArtistas = async (idUsuario, periodo) => {
  const filtroFecha = buildFiltroFecha(periodo, 'b.agregada_en');

  const { rows } = await query(
    `SELECT c.artista_nombre, COUNT(*)::int AS cantidad
     FROM biblioteca b
     JOIN cancion c ON c.deezer_id = b.deezer_id
     WHERE b.id_usuario = $1
       ${filtroFecha}
     GROUP BY c.artista_nombre
     ORDER BY cantidad DESC, c.artista_nombre ASC
     LIMIT 5`,
    [idUsuario],
  );
  return rows;
};

// Géneros que predominan en la biblioteca del usuario en un período.
// Solo cuenta canciones cuyo campo genero en la tabla cancion no sea NULL.
// Devuelve cada género con su cantidad y porcentaje sobre el total con género conocido.
export const getGeneros = async (idUsuario, periodo) => {
  const filtroFecha = buildFiltroFecha(periodo, 'b.agregada_en');

  const { rows } = await query(
    `WITH conteos AS (
       SELECT c.genero, COUNT(*)::int AS cantidad
       FROM biblioteca b
       JOIN cancion c ON c.deezer_id = b.deezer_id
       WHERE b.id_usuario = $1
         AND c.genero IS NOT NULL
         ${filtroFecha}
       GROUP BY c.genero
       ORDER BY cantidad DESC
     ),
     total AS (
       SELECT SUM(cantidad) AS suma FROM conteos
     )
     SELECT
       co.genero,
       co.cantidad,
       ROUND(co.cantidad * 100.0 / NULLIF(t.suma, 0))::int AS porcentaje
     FROM conteos co, total t
     ORDER BY co.cantidad DESC
     LIMIT 10`,
    [idUsuario],
  );
  return rows;
};

// ─── helper interno ────────────────────────────────────────────────────────────
// Devuelve un fragmento SQL seguro (sin parámetros de usuario) para filtrar
// por mes actual o año actual. La columna se recibe como string fijo del código,
// nunca de la entrada del usuario.
function buildFiltroFecha(periodo, columna) {
  if (periodo === 'mes') {
    return `AND EXTRACT(YEAR  FROM ${columna}) = EXTRACT(YEAR  FROM NOW())
            AND EXTRACT(MONTH FROM ${columna}) = EXTRACT(MONTH FROM NOW())`;
  }
  if (periodo === 'anio') {
    return `AND EXTRACT(YEAR FROM ${columna}) = EXTRACT(YEAR FROM NOW())`;
  }
  // Sin filtro de fecha
  return '';
}
