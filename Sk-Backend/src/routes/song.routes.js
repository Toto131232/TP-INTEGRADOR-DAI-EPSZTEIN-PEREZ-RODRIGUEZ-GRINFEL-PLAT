import { Router } from 'express';
import * as songController from '../controllers/song.controller.js';

const router = Router();

// Express 5 propaga solo los errores de los handlers async al errorHandler.

// GET /api/songs/search?q=texto&limit=20&index=0   (pública)
// Busca canciones en Deezer. "index" sirve para pedir la página siguiente.
//   200 -> { data: [canciones], total, nextIndex }   (nextIndex es null si no hay más)
//   400 -> falta "q" o es muy largo, o "limit" (1 a 50) / "index" (>= 0) son inválidos
//   502 -> Deezer no respondió o devolvió un error
router.get('/search', songController.search);

// GET /api/songs/:deezerId   (pública)
// Detalle de una canción con datos frescos de Deezer (incluye los géneros del álbum).
//   200 -> { cancion }
//   400 -> el deezerId no es un número entero positivo
//   404 -> esa canción no existe en Deezer
//   502 -> Deezer no respondió o devolvió un error
router.get('/:deezerId', songController.detail);

export default router;
