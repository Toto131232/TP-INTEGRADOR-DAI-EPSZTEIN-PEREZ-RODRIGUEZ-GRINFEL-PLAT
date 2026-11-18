import deezerApi from '../config/deezer.js';
import { toSong } from '../models/song.model.js';
import { HttpError } from '../middlewares/error.middleware.js';
import * as homeRepository from '../repositories/home.repository.js';

const FAVORITOS_LIMIT = 6;
const DESTACADOS_LIMIT = 10;

// Datos personales de la Home: saludo, "Tu semana" y favoritos.
export const getResumen = async (idUsuario) => {
  const [usuario, stats, favoritos] = await Promise.all([
    homeRepository.findUsuario(idUsuario),
    homeRepository.getStats(idUsuario),
    homeRepository.getFavoritos(idUsuario, FAVORITOS_LIMIT),
  ]);
  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');
  return { usuario, stats, favoritos };
};

// "Destacado de hoy": ranking global de Deezer.
export const getDestacados = async () => {
  const { data } = await deezerApi.get('/chart/0/tracks', {
    params: { limit: DESTACADOS_LIMIT },
  });
  return { data: (data.data ?? []).map(toSong) };
};
