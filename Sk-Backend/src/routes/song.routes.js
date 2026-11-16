import { Router } from 'express';
import * as songController from '../controllers/song.controller.js';

const router = Router();

// Express 5 propaga solo los errores de los handlers async al errorHandler.
router.get('/search', songController.search);

export default router;
