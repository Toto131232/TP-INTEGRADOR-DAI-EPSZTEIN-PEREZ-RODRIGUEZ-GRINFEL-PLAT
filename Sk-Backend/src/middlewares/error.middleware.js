import { env } from '../config/env.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

// Express reconoce el manejador de errores porque tiene 4 parámetros
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Body con JSON mal formado
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);

  const hideDetails = status >= 500 && env.nodeEnv === 'production';
  res.status(status).json({
    error: hideDetails ? 'Error interno del servidor' : err.message || err.code || 'Error interno del servidor',
  });
};
