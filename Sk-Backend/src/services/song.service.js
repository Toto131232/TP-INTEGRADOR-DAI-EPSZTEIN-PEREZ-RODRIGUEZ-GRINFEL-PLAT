import deezerApi from '../config/deezer.js';
import { toSong } from '../models/song.model.js';

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
