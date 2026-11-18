import { Router } from 'express';
import * as homeController from '../controllers/home.controller.js';

const router = Router();

router.get('/resumen', homeController.resumen);
router.get('/destacados', homeController.destacados);

export default router;
