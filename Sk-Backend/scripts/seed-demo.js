// Carga la cuenta de demo con su biblioteca.   Uso: npm run seed:demo
//
// - Si el usuario "demo" ya existe lo borra (con ON DELETE CASCADE se van su biblioteca,
//   reseñas y actividad) y lo vuelve a crear, así se puede correr las veces que haga falta.
// - La contraseña sale de la variable DEMO_PASSWORD del .env y se guarda hasheada con bcrypt
//   (usa el mismo register del login).
// - Las canciones se cargan con las mismas funciones que usan los endpoints: se traen de
//   Deezer, se guardan en la caché y la actividad se registra sola.
import pool, { query } from '../src/config/db.js';
import * as authService from '../src/services/auth.service.js';
import * as libraryService from '../src/services/library.service.js';
import * as reviewService from '../src/services/review.service.js';

const DEMO_USER = { username: 'demo', email: 'demo@example.com', nombre: 'Cuenta Demo' };

// 12 canciones: 4 quiero_escuchar, 3 escuchando, 5 escuchado. 6 puntuadas y 3 con reseña.
const SONGS = [
  { deezerId: 4603408, estado: 'quiero_escuchar' }, // Billie Jean - Michael Jackson
  { deezerId: 655095912, estado: 'quiero_escuchar' }, // bad guy - Billie Eilish
  { deezerId: 426703682, estado: 'quiero_escuchar' }, // Hotel California - Eagles
  { deezerId: 3538068, estado: 'quiero_escuchar' }, // Lamento Boliviano - Los Enanitos Verdes
  { deezerId: 908604612, estado: 'escuchando', puntuacion: 3 }, // Blinding Lights - The Weeknd
  { deezerId: 537033822, estado: 'escuchando' }, // Demoliendo Hoteles - Charly García
  { deezerId: 1124841682, estado: 'escuchando' }, // Levitating - Dua Lipa
  { deezerId: 3135556, estado: 'escuchado', puntuacion: 4 }, // Harder, Better, Faster, Stronger - Daft Punk
  { deezerId: 13791930, estado: 'escuchado', puntuacion: 4 }, // Smells Like Teen Spirit - Nirvana
  {
    deezerId: 13342192, // De Música Ligera - Soda Stereo
    estado: 'escuchado',
    puntuacion: 5,
    resena: 'Un clásico del rock argentino. El riff del comienzo es inconfundible y en vivo suena todavía mejor.',
  },
  {
    deezerId: 4091937401, // Bohemian Rhapsody - Queen
    estado: 'escuchado',
    puntuacion: 5,
    resena: 'Seis minutos que pasan volando. Cada vez que la escucho encuentro un detalle nuevo.',
  },
  {
    deezerId: 13255149, // Crimen - Gustavo Cerati
    estado: 'escuchado',
    puntuacion: 5,
    resena: 'De lo mejor de Cerati solista. La letra es hermosa y los arreglos de cuerdas le dan un aire especial.',
  },
];

const main = async () => {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Definí DEMO_PASSWORD en el .env (mínimo 8 caracteres)');
  }

  await query('DELETE FROM usuario WHERE username = $1 OR email = $2', [DEMO_USER.username, DEMO_USER.email]);
  const { usuario } = await authService.register({ ...DEMO_USER, password });
  const id = usuario.id_usuario;
  console.log(`Usuario "${usuario.username}" creado (id ${id})`);

  for (const song of SONGS) {
    // Todas entran como "quiero escuchar" y después avanzan, como lo haría un usuario real
    const cancion = await libraryService.addSong(id, song.deezerId, 'quiero_escuchar');
    if (song.estado !== 'quiero_escuchar') await libraryService.changeStatus(id, song.deezerId, 'escuchando');
    if (song.estado === 'escuchado') await libraryService.changeStatus(id, song.deezerId, 'escuchado');
    if (song.puntuacion) await libraryService.rate(id, song.deezerId, song.puntuacion);
    if (song.resena) await reviewService.create(id, song.deezerId, song.resena);
    console.log(`  + ${cancion.titulo} - ${cancion.artista_nombre} (${song.estado})`);
  }

  const { rows } = await query(
    `SELECT (SELECT COUNT(*) FROM biblioteca WHERE id_usuario = $1) AS canciones,
            (SELECT COUNT(DISTINCT estado) FROM biblioteca WHERE id_usuario = $1) AS estados,
            (SELECT COUNT(*) FROM biblioteca WHERE id_usuario = $1 AND puntuacion IS NOT NULL) AS puntuaciones,
            (SELECT COUNT(*) FROM resena WHERE id_usuario = $1) AS resenas,
            (SELECT COUNT(*) FROM actividad WHERE id_usuario = $1) AS actividad`,
    [id],
  );
  console.log('Resumen:', rows[0]);
};

main()
  .catch((err) => {
    console.error('Error en el seed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
