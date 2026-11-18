import { withTransaction } from '../config/db.js';
import { HttpError } from '../utils/http-error.js';
import * as reviewRepository from '../repositories/review.repository.js';
import * as songRepository from '../repositories/song.repository.js';
import * as activityRepository from '../repositories/activity.repository.js';
import * as songService from './song.service.js';

const ALREADY_REVIEWED = 'Ya escribiste una reseña para esta canción';

export const listBySong = (deezerId) => reviewRepository.findBySong(deezerId);

export const create = async (idUsuario, deezerId, texto) => {
  if (await reviewRepository.findByUserAndSong(idUsuario, deezerId)) {
    throw new HttpError(409, ALREADY_REVIEWED);
  }

  // Igual que al agregar a la biblioteca: la canción tiene que estar en la caché
  const cancion = await songService.getSongData(deezerId);

  return withTransaction(async (db) => {
    await songRepository.create(db, cancion);
    let review;
    try {
      review = await reviewRepository.create(db, idUsuario, deezerId, texto);
    } catch (err) {
      // 23505 = viola el UNIQUE (id_usuario, deezer_id) de la tabla resena
      if (err.code === '23505') throw new HttpError(409, ALREADY_REVIEWED);
      throw err;
    }
    await activityRepository.create(db, { idUsuario, tipo: 'reseno', deezerId });
    return review;
  });
};

// 404 si la reseña no existe, 403 si existe pero es de otro usuario.
// Se puede distinguir porque las reseñas son públicas: no revelamos nada privado.
const findOwnReview = async (db, idUsuario, idResena) => {
  const review = await reviewRepository.findById(db, idResena);
  if (!review) throw new HttpError(404, 'Reseña no encontrada');
  if (review.id_usuario !== idUsuario) throw new HttpError(403, 'Solo el autor puede modificar esta reseña');
  return review;
};

export const update = (idUsuario, idResena, texto) =>
  withTransaction(async (db) => {
    const review = await findOwnReview(db, idUsuario, idResena);
    const updated = await reviewRepository.update(db, idResena, idUsuario, texto);
    await activityRepository.create(db, { idUsuario, tipo: 'edito_resena', deezerId: review.deezer_id });
    return updated;
  });

// Borrar no registra actividad: la tabla actividad no tiene un tipo para eso
export const remove = (idUsuario, idResena) =>
  withTransaction(async (db) => {
    await findOwnReview(db, idUsuario, idResena);
    await reviewRepository.remove(db, idResena, idUsuario);
  });
