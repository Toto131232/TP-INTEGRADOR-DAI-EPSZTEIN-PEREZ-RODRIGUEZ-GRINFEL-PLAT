import * as libraryService from '../services/library.service.js';
import { HttpError } from '../utils/http-error.js';
import { parseId } from '../utils/validation.js';

// El id del usuario sale SIEMPRE de req.user (lo pone el middleware JWT a partir del token),
// nunca del body ni de los params.

// Estados de una canción en la biblioteca ('favorito' no es un estado)
const ESTADOS = ['quiero_escuchar', 'escuchando', 'escuchado'];
const ORDENES = ['fecha', 'puntuacion'];
const DIRECCIONES = ['asc', 'desc'];

const checkEstado = (estado) => {
  if (!ESTADOS.includes(estado)) {
    throw new HttpError(400, `estado debe ser uno de: ${ESTADOS.join(', ')}`);
  }
  return estado;
};

// GET /api/library?estado=&puntuacion_min=&orden=fecha|puntuacion&direccion=asc|desc
export const list = async (req, res) => {
  const { estado, puntuacion_min: puntuacionMin, orden = 'fecha', direccion = 'desc' } = req.query;

  if (!ORDENES.includes(orden)) {
    throw new HttpError(400, `orden debe ser uno de: ${ORDENES.join(', ')}`);
  }
  if (!DIRECCIONES.includes(direccion)) {
    throw new HttpError(400, `direccion debe ser uno de: ${DIRECCIONES.join(', ')}`);
  }

  const filters = { orden, direccion };
  if (estado !== undefined) filters.estado = checkEstado(estado);
  if (puntuacionMin !== undefined) {
    if (!/^[1-5]$/.test(puntuacionMin)) {
      throw new HttpError(400, 'puntuacion_min debe ser un número entero entre 1 y 5');
    }
    filters.puntuacionMin = Number(puntuacionMin);
  }

  const canciones = await libraryService.list(req.user.id, filters);
  res.json({ total: canciones.length, canciones });
};

// GET /api/library/:deezerId
export const getOne = async (req, res) => {
  const deezerId = parseId(req.params.deezerId, 'deezer_id');
  const cancion = await libraryService.getOne(req.user.id, deezerId);
  res.json({ cancion });
};

// POST /api/library   body: { deezer_id, estado? }
export const add = async (req, res) => {
  const { deezer_id: rawDeezerId, estado = 'quiero_escuchar' } = req.body ?? {};
  const deezerId = parseId(rawDeezerId, 'deezer_id');

  const cancion = await libraryService.addSong(req.user.id, deezerId, checkEstado(estado));
  res.status(201).json({ cancion });
};

// DELETE /api/library/:deezerId
export const remove = async (req, res) => {
  const deezerId = parseId(req.params.deezerId, 'deezer_id');
  await libraryService.removeSong(req.user.id, deezerId);
  res.status(204).end();
};

// PATCH /api/library/:deezerId/status   body: { estado }
export const changeStatus = async (req, res) => {
  const deezerId = parseId(req.params.deezerId, 'deezer_id');
  const { estado } = req.body ?? {};

  const cancion = await libraryService.changeStatus(req.user.id, deezerId, checkEstado(estado));
  res.json({ cancion });
};

// PUT /api/library/:deezerId/rating   body: { puntuacion }
export const rate = async (req, res) => {
  const deezerId = parseId(req.params.deezerId, 'deezer_id');
  const { puntuacion } = req.body ?? {};
  if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
    throw new HttpError(400, 'puntuacion debe ser un número entero entre 1 y 5');
  }

  const cancion = await libraryService.rate(req.user.id, deezerId, puntuacion);
  res.json({ cancion });
};
