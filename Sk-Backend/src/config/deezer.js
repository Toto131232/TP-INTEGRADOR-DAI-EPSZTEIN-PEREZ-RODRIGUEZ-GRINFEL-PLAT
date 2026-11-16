import axios from 'axios';
import { env } from './env.js';
import { HttpError } from '../middlewares/error.middleware.js';

// Cliente HTTP único para la API pública de Deezer.
// Uso: import deezerApi from '../config/deezer.js';
//      const { data } = await deezerApi.get('/search', { params: { q } });
const deezerApi = axios.create({
  baseURL: env.deezer.baseURL,
  timeout: env.deezer.timeout,
});

// Deezer responde 200 aun cuando hay error, con { error: { type, message, code } }.
// Lo convertimos en un HttpError para que lo maneje el errorHandler.
deezerApi.interceptors.response.use(
  (res) => {
    if (res.data?.error) {
      const { message, code } = res.data.error;
      const status = code === 800 ? 404 : 502; // 800 = "no data" (recurso inexistente)
      throw new HttpError(status, `Deezer: ${message}`);
    }
    return res;
  },
  (err) => {
    throw new HttpError(502, `Deezer no disponible: ${err.message}`);
  },
);

export default deezerApi;
