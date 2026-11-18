import pg from 'pg';
import { env } from './env.js';

// Por defecto pg devuelve los BIGINT como texto. Los ids de Deezer son BIGINT
// y entran sin problema en un Number de JS, así que los convertimos a número.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));
// Las fechas (DATE) quedan como texto 'AAAA-MM-DD' para que la zona horaria no las corra.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const pool = new pg.Pool(env.db);

// Si se cae una conexión que estaba libre, lo mostramos en vez de romper el servidor.
pool.on('error', (err) => console.error('Error inesperado en PostgreSQL:', err.message));

export const query = (text, params) => pool.query(text, params);

// Ejecuta varias queries como una sola operación: o se guardan todas o ninguna.
// "callback" recibe el client de la transacción y tiene que usarlo para sus queries.
export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
