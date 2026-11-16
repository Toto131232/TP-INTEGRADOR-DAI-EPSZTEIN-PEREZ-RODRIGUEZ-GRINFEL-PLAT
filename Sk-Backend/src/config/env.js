import 'dotenv/config';

export const env = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  },
};

if (!env.jwt.secret) {
  throw new Error('Falta la variable de entorno JWT_SECRET (ver .env.example)');
}
