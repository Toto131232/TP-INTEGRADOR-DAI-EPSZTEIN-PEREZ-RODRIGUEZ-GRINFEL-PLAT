import app from './app.js';
import { env } from './config/env.js';
import { query } from './config/db.js';

app.listen(env.port, async () => {
  console.log(`Server running on http://localhost:${env.port}`);

  // Prueba la conexión al arrancar para enterarnos enseguida si la BD no responde
  try {
    await query('SELECT 1');
    console.log(`Conectado a PostgreSQL (${env.db.database})`);
  } catch (err) {
    console.error(`No se pudo conectar a PostgreSQL: ${err.message}`);
  }
});
