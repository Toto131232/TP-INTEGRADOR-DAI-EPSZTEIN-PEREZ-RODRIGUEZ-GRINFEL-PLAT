import { Router } from 'express';
import authRoutes from './auth.routes.js';
import songRoutes from './song.routes.js';
import homeRoutes from './home.routes.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import * as libraryController from '../controllers/library.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import * as activityController from '../controllers/activity.controller.js';
import * as playlistController from '../controllers/playlist.controller.js';
import { query } from '../config/db.js';

const router = Router();

// Responde 503 si la BD no contesta, así el health refleja el estado real del backend
router.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', db: 'sin conexión' });
  }
});
router.use('/auth', authRoutes);

// Biblioteca del usuario logueado (todas piden token)
router.get('/library', requireAuth, libraryController.list);
router.post('/library', requireAuth, libraryController.add);
router.get('/library/:deezerId', requireAuth, libraryController.getOne);
router.delete('/library/:deezerId', requireAuth, libraryController.remove);
router.patch('/library/:deezerId/status', requireAuth, libraryController.changeStatus);
router.put('/library/:deezerId/rating', requireAuth, libraryController.rate);

// Reseñas: listar las de una canción es público; crear, editar y borrar piden token
router.get('/songs/:deezerId/reviews', reviewController.listBySong);
router.post('/songs/:deezerId/reviews', requireAuth, reviewController.create);
router.put('/reviews/:idResena', requireAuth, reviewController.update);
router.delete('/reviews/:idResena', requireAuth, reviewController.remove);

// Playlists del usuario logueado (todas piden token)
router.get('/playlists', requireAuth, playlistController.list);
router.post('/playlists', requireAuth, playlistController.create);
router.get('/playlists/:idPlaylist', requireAuth, playlistController.getOne);
router.patch('/playlists/:idPlaylist', requireAuth, playlistController.update);
router.delete('/playlists/:idPlaylist', requireAuth, playlistController.remove);
router.post('/playlists/:idPlaylist/songs', requireAuth, playlistController.addSong);
router.delete('/playlists/:idPlaylist/songs/:deezerId', requireAuth, playlistController.removeSong);

// Actividad reciente del usuario logueado
router.get('/activity', requireAuth, activityController.list);

router.use('/songs', songRoutes);
router.use('/home', homeRoutes);

export default router;
