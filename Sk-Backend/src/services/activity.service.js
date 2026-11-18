import * as activityRepository from '../repositories/activity.repository.js';

// La actividad se registra desde library.service y review.service, dentro de sus
// transacciones. Acá solo se lee.
export const listRecent = (idUsuario, limit) => activityRepository.findRecentByUser(idUsuario, limit);
