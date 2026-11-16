import { Router } from 'express';
import songRoutes from './song.routes.js';
import homeRoutes from './home.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.use('/songs', songRoutes);
router.use('/home', homeRoutes);

export default router;
