import { query } from '../config/db.js';

// Tabla cancion = caché de Deezer. Solo guarda lo necesario para mostrar la biblioteca.

export const findById = async (deezerId) => {
  const { rows } = await query('SELECT * FROM cancion WHERE deezer_id = $1', [deezerId]);
  return rows[0] || null;
};

// "db" es el client de la transacción (ver withTransaction en config/db.js).
// ON CONFLICT DO NOTHING: si la canción ya estaba guardada, no hace nada y no da error.
export const create = async (db, cancion) => {
  await db.query(
    `INSERT INTO cancion (deezer_id, titulo, artista_deezer_id, artista_nombre, album_titulo,
                          portada_url, duracion_seg, genero, fecha_lanzamiento)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (deezer_id) DO NOTHING`,
    [
      cancion.deezer_id,
      cancion.titulo,
      cancion.artista_deezer_id,
      cancion.artista_nombre,
      cancion.album_titulo,
      cancion.portada_url,
      cancion.duracion_seg,
      cancion.genero,
      cancion.fecha_lanzamiento,
    ],
  );
};
