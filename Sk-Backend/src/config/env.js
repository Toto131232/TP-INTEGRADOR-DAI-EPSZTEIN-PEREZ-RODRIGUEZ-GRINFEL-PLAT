import 'dotenv/config';

// Variables sin las que el servidor no puede funcionar (sus valores van en .env)
const REQUIRED = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Faltan variables de entorno: ${missing.join(', ')} (ver .env.example)`);
}

export const env = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  deezer: {
    baseURL: process.env.DEEZER_API_URL || 'https://api.deezer.com',
    timeout: Number(process.env.DEEZER_TIMEOUT_MS) || 8000,
  },
  },
};
