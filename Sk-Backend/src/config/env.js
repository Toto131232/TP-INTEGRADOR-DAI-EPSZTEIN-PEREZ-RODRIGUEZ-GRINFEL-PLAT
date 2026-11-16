import 'dotenv/config';

export const env = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  deezer: {
    baseURL: process.env.DEEZER_API_URL || 'https://api.deezer.com',
    timeout: Number(process.env.DEEZER_TIMEOUT_MS) || 8000,
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'skmusic',
  },
};
