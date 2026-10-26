import { Router } from 'express';
import songRoutes from './song.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.use('/songs', songRoutes);

export default router;
