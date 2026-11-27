import 'dotenv/config';

// Variables sin las que el servidor no puede funcionar (sus valores van en .env)
// En producción (Supabase) alcanza con DATABASE_URL; en local se usan las DB_* sueltas.
const REQUIRED = process.env.DATABASE_URL
  ? ['JWT_SECRET']
  : ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
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
  // Lo recibe pg.Pool en config/db.js
  // Si hay DATABASE_URL (la "connection string" de Supabase) se usa esa, con SSL.
  db: process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
};
