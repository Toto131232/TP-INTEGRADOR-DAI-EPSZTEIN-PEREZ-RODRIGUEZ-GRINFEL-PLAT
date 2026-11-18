import deezerApi from '../config/deezer.js';
import { toSong } from '../models/song.model.js';
import { HttpError } from '../utils/http-error.js';
import * as songRepository from '../repositories/song.repository.js';

// Busca canciones en Deezer. Devuelve la página pedida y datos para paginar.
export const searchSongs = async ({ q, limit, index }) => {
  const { data } = await deezerApi.get('/search', {
    params: { q, limit, index },
  });

  const canciones = (data.data ?? []).map(toSong);
  const total = data.total ?? canciones.length;
  const siguiente = index + canciones.length;

  return {
    data: canciones,
    total,
    nextIndex: data.next && siguiente < total ? siguiente : null,
  };
};

// Recorta textos largos para que entren en las columnas VARCHAR de la tabla cancion
const cut = (text, max) => (text ? String(text).slice(0, max) : null);

// El track de Deezer no trae el género: está en su álbum.
// Si esa segunda llamada falla, guardamos la canción igual, sin género.
const fetchGenre = async (albumId) => {
  if (!albumId) return null;
  try {
    const { data: album } = await deezerApi.get(`/album/${albumId}`);
    return album.genres?.data?.[0]?.name ?? null;
  } catch {
    return null;
  }
};

// Convierte la respuesta de Deezer en una fila de la tabla cancion
const toCancion = (deezerId, track, genre) => ({
  deezer_id: deezerId,
  titulo: cut(track.title, 200),
  artista_deezer_id: track.artist?.id ?? null,
  artista_nombre: cut(track.artist?.name, 150) || 'Desconocido',
  album_titulo: cut(track.album?.title, 200),
  portada_url: track.album?.cover_medium ?? null,
  duracion_seg: track.duration > 0 ? track.duration : null,
  genero: cut(genre, 60),
  // Deezer manda '0000-00-00' cuando no conoce la fecha
  fecha_lanzamiento: track.release_date && !track.release_date.startsWith('0000') ? track.release_date : null,
});

// Devuelve los datos de una canción: primero busca en la caché (tabla cancion)
// y solo si no está la pide a Deezer. No la guarda: eso lo hace quien la usa,
// dentro de su transacción (con songRepository.create).
export const getSongData = async (deezerId) => {
  const cached = await songRepository.findById(deezerId);
  if (cached) return cached;

  let track;
  try {
    ({ data: track } = await deezerApi.get(`/track/${deezerId}`));
  } catch (err) {
    if (err.status === 404) throw new HttpError(404, `No existe una canción con id ${deezerId} en Deezer`);
    throw err; // Deezer caído o lento: 502
  }

  const genre = await fetchGenre(track.album?.id);
  return toCancion(deezerId, track, genre);
};
