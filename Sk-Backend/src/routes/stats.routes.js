import { Router } from 'express';
import * as statsController from '../controllers/stats.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/stats?periodo=mes|anio|todo  (protegida)
router.get('/', requireAuth, statsController.getStats);

export default router;
