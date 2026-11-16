import * as playlistService from '../services/playlist.service.js';
import { HttpError } from '../utils/http-error.js';
import { parseId, MAX_INT } from '../utils/validation.js';

// El id del usuario sale SIEMPRE de req.user (lo pone el middleware JWT a partir del token),
// nunca del body ni de los params.

// Largos máximos (nombre y descripcion son los de las columnas de la tabla playlist)
const MAX_NOMBRE = 100;
const MAX_DESCRIPCION = 300;
const MAX_PORTADA = 500;

// id_playlist es SERIAL (INT): no puede pasar de MAX_INT
const parsePlaylistId = (value) => parseId(value, 'id_playlist', MAX_INT);

const checkNombre = (nombre) => {
  if (typeof nombre !== 'string' || nombre.trim().length === 0) {
    throw new HttpError(400, 'nombre es obligatorio y no puede estar vacío');
  }
  if (nombre.trim().length > MAX_NOMBRE) {
    throw new HttpError(400, `nombre puede tener como máximo ${MAX_NOMBRE} caracteres`);
  }
  return nombre.trim();
};

// Opcional: null o texto vacío = sin descripción
const checkDescripcion = (descripcion) => {
  if (descripcion == null) return null;
  if (typeof descripcion !== 'string') {
    throw new HttpError(400, 'descripcion debe ser texto');
  }
  if (descripcion.trim().length > MAX_DESCRIPCION) {
    throw new HttpError(400, `descripcion puede tener como máximo ${MAX_DESCRIPCION} caracteres`);
  }
  return descripcion.trim() || null;
};

// new URL() tira error si el texto no es una URL. Además pedimos que sea http o https
// (así no se puede guardar algo como "javascript:..." o "file:...").
const isHttpUrl = (text) => {
  try {
    const { protocol } = new URL(text);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

// Opcional: null o texto vacío = sin portada
const checkPortada = (portadaUrl) => {
  if (portadaUrl == null) return null;
  const text = typeof portadaUrl === 'string' ? portadaUrl.trim() : null;
  if (text === '') return null;
  if (text === null || text.length > MAX_PORTADA || !isHttpUrl(text)) {
    throw new HttpError(400, `portada_url debe ser una URL http o https de hasta ${MAX_PORTADA} caracteres`);
  }
  return text;
};

// GET /api/playlists
export const list = async (req, res) => {
  const playlists = await playlistService.list(req.user.id);
  res.json({ total: playlists.length, playlists });
};

// GET /api/playlists/:idPlaylist
export const getOne = async (req, res) => {
  const idPlaylist = parsePlaylistId(req.params.idPlaylist);
  const playlist = await playlistService.getDetail(req.user.id, idPlaylist);
  res.json({ playlist });
};

// POST /api/playlists   body: { nombre, descripcion?, portada_url? }
export const create = async (req, res) => {
  const { nombre, descripcion, portada_url: portadaUrl } = req.body ?? {};

  const playlist = await playlistService.create(req.user.id, {
    nombre: checkNombre(nombre),
    descripcion: checkDescripcion(descripcion),
    portada_url: checkPortada(portadaUrl),
  });
  res.status(201).json({ playlist });
};

// PATCH /api/playlists/:idPlaylist   body: { nombre?, descripcion?, portada_url? } (al menos uno)
// Solo cambia los campos que vienen. descripcion o portada_url en null las borran.
export const update = async (req, res) => {
  const idPlaylist = parsePlaylistId(req.params.idPlaylist);
  const body = req.body ?? {};

  const cambios = {};
  if (body.nombre !== undefined) cambios.nombre = checkNombre(body.nombre);
  if (body.descripcion !== undefined) cambios.descripcion = checkDescripcion(body.descripcion);
  if (body.portada_url !== undefined) cambios.portada_url = checkPortada(body.portada_url);
  if (Object.keys(cambios).length === 0) {
    throw new HttpError(400, 'Mandá al menos uno de estos campos: nombre, descripcion, portada_url');
  }

  const playlist = await playlistService.update(req.user.id, idPlaylist, cambios);
  res.json({ playlist });
};

// DELETE /api/playlists/:idPlaylist
export const remove = async (req, res) => {
  const idPlaylist = parsePlaylistId(req.params.idPlaylist);
  await playlistService.remove(req.user.id, idPlaylist);
  res.status(204).end();
};

// POST /api/playlists/:idPlaylist/songs   body: { deezer_id }
export const addSong = async (req, res) => {
  const idPlaylist = parsePlaylistId(req.params.idPlaylist);
  const deezerId = parseId(req.body?.deezer_id, 'deezer_id');

  const cancion = await playlistService.addSong(req.user.id, idPlaylist, deezerId);
  res.status(201).json({ cancion });
};

// DELETE /api/playlists/:idPlaylist/songs/:deezerId
export const removeSong = async (req, res) => {
  const idPlaylist = parsePlaylistId(req.params.idPlaylist);
  const deezerId = parseId(req.params.deezerId, 'deezer_id');

  await playlistService.removeSong(req.user.id, idPlaylist, deezerId);
  res.status(204).end();
};
