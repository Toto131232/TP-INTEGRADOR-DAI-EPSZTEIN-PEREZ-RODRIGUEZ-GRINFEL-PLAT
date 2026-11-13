import { withTransaction } from '../config/db.js';
import { HttpError } from '../utils/http-error.js';
import * as libraryRepository from '../repositories/library.repository.js';
import * as songRepository from '../repositories/song.repository.js';
import * as activityRepository from '../repositories/activity.repository.js';
import * as songService from './song.service.js';

const NOT_IN_LIBRARY = 'La canción no está en tu biblioteca';
const ALREADY_IN_LIBRARY = 'La canción ya está en tu biblioteca';

export const list = (idUsuario, filters) => libraryRepository.findAllByUser(idUsuario, filters);

export const getOne = async (idUsuario, deezerId) => {
  const item = await libraryRepository.findOne(idUsuario, deezerId);
  if (!item) throw new HttpError(404, NOT_IN_LIBRARY);
  return item;
};

export const addSong = async (idUsuario, deezerId, estado) => {
  // Si ya la tiene cortamos acá, sin llamar a Deezer
  if (await libraryRepository.findOne(idUsuario, deezerId)) {
    throw new HttpError(409, ALREADY_IN_LIBRARY);
  }

  // A Deezer se lo consulta ANTES de abrir la transacción, para no dejarla
  // abierta mientras esperamos una respuesta de internet.
  const cancion = await songService.getSongData(deezerId);

  // Tres escrituras (caché, biblioteca, actividad): o se guardan las tres o ninguna
  await withTransaction(async (db) => {
    await songRepository.create(db, cancion);
    try {
      await libraryRepository.create(db, idUsuario, deezerId, estado);
    } catch (err) {
      // 23505 = clave primaria duplicada: llegó otro pedido igual justo antes
      if (err.code === '23505') throw new HttpError(409, ALREADY_IN_LIBRARY);
      throw err;
    }
    await activityRepository.create(db, { idUsuario, tipo: 'agrego_cancion', deezerId, detalle: estado });
  });

  return libraryRepository.findOne(idUsuario, deezerId);
};

export const removeSong = async (idUsuario, deezerId) => {
  await withTransaction(async (db) => {
    const deleted = await libraryRepository.remove(db, idUsuario, deezerId);
    if (deleted === 0) throw new HttpError(404, NOT_IN_LIBRARY);
    await activityRepository.create(db, { idUsuario, tipo: 'quito_cancion', deezerId });
  });
};

export const changeStatus = async (idUsuario, deezerId, estado) => {
  await withTransaction(async (db) => {
    const current = await libraryRepository.findForUpdate(db, idUsuario, deezerId);
    if (!current) throw new HttpError(404, NOT_IN_LIBRARY);
    if (current.estado === estado) return; // no cambió nada: no se registra actividad

    await libraryRepository.updateStatus(db, idUsuario, deezerId, estado);
    await activityRepository.create(db, {
      idUsuario,
      tipo: 'cambio_estado',
      deezerId,
      detalle: `${current.estado} -> ${estado}`,
    });
  });

  return libraryRepository.findOne(idUsuario, deezerId);
};

// Crea la puntuación si no tenía, o la reemplaza si ya tenía una
export const rate = async (idUsuario, deezerId, puntuacion) => {
  await withTransaction(async (db) => {
    const current = await libraryRepository.findForUpdate(db, idUsuario, deezerId);
    if (!current) throw new HttpError(404, NOT_IN_LIBRARY);
    if (current.puntuacion === puntuacion) return;

    await libraryRepository.updateRating(db, idUsuario, deezerId, puntuacion);
    await activityRepository.create(db, {
      idUsuario,
      tipo: 'puntuo',
      deezerId,
      detalle: puntuacion === 1 ? '1 estrella' : `${puntuacion} estrellas`,
    });
  });

  return libraryRepository.findOne(idUsuario, deezerId);
};
