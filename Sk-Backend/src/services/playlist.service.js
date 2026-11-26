import { withTransaction } from '../config/db.js';
import { HttpError } from '../utils/http-error.js';
import * as playlistRepository from '../repositories/playlist.repository.js';
import * as songRepository from '../repositories/song.repository.js';
import * as activityRepository from '../repositories/activity.repository.js';
import * as songService from './song.service.js';

// Si la playlist no existe o es de otro usuario respondemos lo mismo (404):
// las playlists son privadas, así no revelamos que existe. (Igual que la biblioteca)
const NOT_FOUND = 'Playlist no encontrada';
const NAME_TAKEN = 'Ya tenés una playlist con ese nombre';
const ALREADY_IN_PLAYLIST = 'La canción ya está en esta playlist';
const NOT_IN_PLAYLIST = 'La canción no está en esta playlist';

// 23505 = viola un UNIQUE o una clave primaria
const isDuplicate = (err) => err.code === '23505';

// La columna actividad.detalle es VARCHAR(200)
const cutDetail = (text) => text.slice(0, 200);

const getOwn = async (idUsuario, idPlaylist) => {
  const playlist = await playlistRepository.findByIdAndUser(idPlaylist, idUsuario);
  if (!playlist) throw new HttpError(404, NOT_FOUND);
  return playlist;
};

// Igual que getOwn, pero dentro de la transacción y bloqueando la playlist hasta el COMMIT
const lockOwn = async (db, idUsuario, idPlaylist) => {
  const playlist = await playlistRepository.findForUpdate(db, idPlaylist, idUsuario);
  if (!playlist) throw new HttpError(404, NOT_FOUND);
  return playlist;
};

export const list = (idUsuario) => playlistRepository.findAllByUser(idUsuario);

export const getDetail = async (idUsuario, idPlaylist) => {
  const playlist = await getOwn(idUsuario, idPlaylist);
  const canciones = await playlistRepository.findSongs(idPlaylist);
  return { ...playlist, cantidad_canciones: canciones.length, canciones };
};

// datos = { nombre, descripcion, portada_url } ya validados por el controller
export const create = (idUsuario, datos) =>
  withTransaction(async (db) => {
    let playlist;
    try {
      playlist = await playlistRepository.create(db, idUsuario, datos);
    } catch (err) {
      // El índice único (id_usuario, LOWER(nombre)) no deja repetir nombres
      if (isDuplicate(err)) throw new HttpError(409, NAME_TAKEN);
      throw err;
    }
    await activityRepository.create(db, {
      idUsuario,
      tipo: 'creo_playlist',
      idPlaylist: playlist.id_playlist,
      detalle: playlist.nombre,
    });
    return playlist;
  });

// cambios = solo los campos que mandó el usuario (nombre, descripcion y/o portada_url)
export const update = (idUsuario, idPlaylist, cambios) =>
  withTransaction(async (db) => {
    const actual = await lockOwn(db, idUsuario, idPlaylist);
    const nueva = { ...actual, ...cambios };

    const renamed = nueva.nombre !== actual.nombre;
    const changed =
      renamed || nueva.descripcion !== actual.descripcion || nueva.portada_url !== actual.portada_url;
    if (!changed) return actual; // no cambió nada: no se registra actividad

    let playlist;
    try {
      playlist = await playlistRepository.update(db, idPlaylist, idUsuario, nueva);
    } catch (err) {
      if (isDuplicate(err)) throw new HttpError(409, NAME_TAKEN);
      throw err;
    }
    await activityRepository.create(db, {
      idUsuario,
      tipo: 'edito_playlist',
      idPlaylist,
      // Mismo formato que cambio_estado de la biblioteca: 'antes -> después'
      detalle: cutDetail(renamed ? `${actual.nombre} -> ${nueva.nombre}` : nueva.nombre),
    });
    return playlist;
  });

export const remove = (idUsuario, idPlaylist) =>
  withTransaction(async (db) => {
    const playlist = await lockOwn(db, idUsuario, idPlaylist);
    await playlistRepository.remove(db, idPlaylist, idUsuario);
    // Sin idPlaylist porque la playlist ya no existe: el nombre queda guardado en detalle.
    // (La actividad vieja de esta playlist queda con id_playlist en NULL por ON DELETE SET NULL)
    await activityRepository.create(db, { idUsuario, tipo: 'borro_playlist', detalle: playlist.nombre });
  });

// La canción no hace falta que esté en la biblioteca: solo tiene que existir en Deezer
export const addSong = async (idUsuario, idPlaylist, deezerId) => {
  // Controles rápidos: si fallan, cortamos sin llamar a Deezer
  await getOwn(idUsuario, idPlaylist);
  if (await playlistRepository.hasSong(idPlaylist, deezerId)) {
    throw new HttpError(409, ALREADY_IN_PLAYLIST);
  }

  // Igual que la biblioteca: se busca en la caché o en Deezer ANTES de abrir la transacción,
  // para no dejarla abierta mientras esperamos una respuesta de internet.
  const cancion = await songService.getSongData(deezerId);

  // Tres escrituras (caché, playlist_cancion, actividad): o se guardan las tres o ninguna
  await withTransaction(async (db) => {
    // Se vuelve a controlar adentro: la playlist pudo borrarse mientras esperábamos a Deezer
    const playlist = await lockOwn(db, idUsuario, idPlaylist);
    await songRepository.create(db, cancion);
    const posicion = await playlistRepository.nextPosition(db, idPlaylist);
    try {
      await playlistRepository.addSong(db, idPlaylist, deezerId, posicion);
    } catch (err) {
      // Clave primaria (id_playlist, deezer_id): llegó otro pedido igual justo antes
      if (isDuplicate(err)) throw new HttpError(409, ALREADY_IN_PLAYLIST);
      throw err;
    }
    await activityRepository.create(db, {
      idUsuario,
      tipo: 'agrego_a_playlist',
      deezerId,
      idPlaylist,
      detalle: playlist.nombre,
    });
  });

  return playlistRepository.findSong(idPlaylist, deezerId);
};

export const removeSong = (idUsuario, idPlaylist, deezerId) =>
  withTransaction(async (db) => {
    const playlist = await lockOwn(db, idUsuario, idPlaylist);
    const posicion = await playlistRepository.removeSong(db, idPlaylist, deezerId);
    if (posicion === null) throw new HttpError(404, NOT_IN_PLAYLIST);

    await playlistRepository.closeGap(db, idPlaylist, posicion);
    await activityRepository.create(db, {
      idUsuario,
      tipo: 'quito_de_playlist',
      deezerId,
      idPlaylist,
      detalle: playlist.nombre,
    });
  });
