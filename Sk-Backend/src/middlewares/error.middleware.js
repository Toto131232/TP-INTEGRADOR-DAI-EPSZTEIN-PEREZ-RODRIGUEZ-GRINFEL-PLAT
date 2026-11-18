// La clase vive en utils/http-error.js (la usa el login). Se re-exporta acá
// para que el código que ya la importaba desde este archivo siga funcionando.
export { HttpError } from '../utils/http-error.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Route not found' });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Body con JSON mal formado (lo detecta express.json())
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  const status = err.status || 500;
  // Los 500 son errores inesperados (BD, bugs): el detalle va al log y al cliente
  // le llega un mensaje genérico, para no exponer tablas ni datos de la conexión.
  if (status === 500) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
  res.status(status).json({ error: err.message });
};
