import * as activityService from '../services/activity.service.js';
import { parseId } from '../utils/validation.js';

// GET /api/activity?limite=20   (máximo 100)
export const list = async (req, res) => {
  const limit = parseId(req.query.limite ?? 20, 'limite', 100);
  const actividad = await activityService.listRecent(req.user.id, limit);
  res.json({ total: actividad.length, actividad });
};
