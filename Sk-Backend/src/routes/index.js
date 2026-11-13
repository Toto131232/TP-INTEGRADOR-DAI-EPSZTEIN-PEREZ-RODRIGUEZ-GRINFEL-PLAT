import { Router } from 'express';
import authRoutes from './auth.routes.js';
import songRoutes from './song.routes.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import * as libraryController from '../controllers/library.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import * as activityController from '../controllers/activity.controller.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
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

// Actividad reciente del usuario logueado
router.get('/activity', requireAuth, activityController.list);

router.use('/songs', songRoutes);

export default router;
