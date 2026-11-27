// Crea las tablas en la base de producción corriendo los .sql de la raíz del repo, en orden.
// Uso (desde Sk-Backend):
//   node scripts/crear-base.js "postgresql://usuario:pass@host/base"          -> tablas + migraciones
//   node scripts/crear-base.js "postgresql://usuario:pass@host/base" --demo   -> además carga el usuario demo
// OJO: skmusic_db_v2.sql borra y vuelve a crear las tablas. Correrlo solo sobre una base nueva.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const url = process.argv[2];
if (!url || !url.startsWith('postgres')) {
  console.error('Falta la URL de la base. Uso: node scripts/crear-base.js "postgresql://..." [--demo]');
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const archivos = [
  'skmusic_db_v2.sql',
  'skmusic_migracion_01_sin_favorito.sql',
  'skmusic_migracion_02_me_gusta.sql',
  'skmusic_migracion_03_playlists.sql',
];
if (process.argv.includes('--demo')) archivos.push('skmusic_seed_demo.sql');

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('Conectado a la base.');
  for (const archivo of archivos) {
    const sql = fs.readFileSync(path.join(root, archivo), 'utf8');
    await client.query(sql);
    console.log(`OK  ${archivo}`);
  }
  const { rows } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1"
  );
  console.log('Tablas creadas:', rows.map((r) => r.table_name).join(', '));
} catch (err) {
  console.error('Error:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
