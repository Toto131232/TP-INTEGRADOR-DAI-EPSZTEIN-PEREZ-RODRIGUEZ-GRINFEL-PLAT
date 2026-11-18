import { Router } from 'express';
import * as homeController from '../controllers/home.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/resumen', requireAuth, homeController.resumen);
router.get('/destacados', homeController.destacados);

export default router;
