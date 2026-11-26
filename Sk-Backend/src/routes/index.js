import { Router } from 'express';
import authRoutes from './auth.routes.js';
import songRoutes from './song.routes.js';
import homeRoutes from './home.routes.js';
import profileRoutes from './profile.routes.js';
import statsRoutes from './stats.routes.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import * as libraryController from '../controllers/library.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import * as activityController from '../controllers/activity.controller.js';
import * as playlistController from '../controllers/playlist.controller.js';
import * as profileController from '../controllers/profile.controller.js';
import { query } from '../config/db.js';

const router = Router();

// Status que puede devolver CUALQUIER endpoint (los maneja error.middleware.js):
//   400 -> el body no es un JSON válido
//   404 -> la ruta no existe
//   500 -> error inesperado (por ejemplo, se cayó la base de datos)
// Y todas las rutas "con token" (requireAuth) pueden devolver:
//   401 -> falta el token, es inválido/vencido o el usuario del token ya no existe

// GET /api/health   (pública)
// Chequea que el backend y la base de datos estén funcionando.
//   200 -> { status: 'ok', db: 'ok' }
//   503 -> la base de datos no contesta
router.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', db: 'sin conexión' });
  }
});

// /api/auth/... -> registro, login, username disponible y /me (ver auth.routes.js)
router.use('/auth', authRoutes);

// ---------- Biblioteca del usuario logueado (todas piden token) ----------
// Estados posibles de una canción: 'quiero_escuchar', 'escuchando', 'escuchado'

// GET /api/library?estado=&puntuacion_min=&orden=fecha|puntuacion&direccion=asc|desc
// Lista las canciones de la biblioteca, con filtros y orden opcionales.
//   200 -> { total, canciones }
//   400 -> algún filtro es inválido (estado, puntuacion_min de 1 a 5, orden o direccion)
router.get('/library', requireAuth, libraryController.list);

// POST /api/library   body: { deezer_id, estado? }   (estado por defecto: 'quiero_escuchar')
// Agrega una canción a la biblioteca. Trae sus datos de Deezer y registra la actividad.
//   201 -> se agregó: { cancion }
//   400 -> deezer_id o estado inválidos
//   404 -> esa canción no existe en Deezer
//   409 -> la canción ya estaba en la biblioteca
//   502 -> Deezer no respondió o devolvió un error
router.post('/library', requireAuth, libraryController.add);

// GET /api/library/:deezerId
// Devuelve una canción de la biblioteca (con su estado, puntuación y me gusta).
//   200 -> { cancion }
//   400 -> el deezerId no es un número entero positivo
//   404 -> la canción no está en la biblioteca
router.get('/library/:deezerId', requireAuth, libraryController.getOne);

// DELETE /api/library/:deezerId
// Saca una canción de la biblioteca.
//   204 -> se borró (la respuesta no tiene cuerpo)
//   400 -> el deezerId no es un número entero positivo
//   404 -> la canción no está en la biblioteca
router.delete('/library/:deezerId', requireAuth, libraryController.remove);

// PATCH /api/library/:deezerId/status   body: { estado }
// Cambia el estado de una canción (por ejemplo de 'quiero_escuchar' a 'escuchado').
//   200 -> { cancion }   (ya actualizada)
//   400 -> deezerId o estado inválidos
//   404 -> la canción no está en la biblioteca
router.patch('/library/:deezerId/status', requireAuth, libraryController.changeStatus);

// PUT /api/library/:deezerId/rating   body: { puntuacion }
// Pone o cambia la puntuación (1 a 5 estrellas) de una canción de la biblioteca.
//   200 -> { cancion }
//   400 -> deezerId inválido o puntuacion no es un entero entre 1 y 5
//   404 -> la canción no está en la biblioteca
router.put('/library/:deezerId/rating', requireAuth, libraryController.rate);

// PUT /api/library/:deezerId/like   body: { me_gusta: true | false }
// Marca o desmarca "me gusta". Si la canción no estaba en la biblioteca y le das
// me gusta, se agrega sola como 'escuchado'.
//   200 -> { cancion }
//   400 -> deezerId inválido o me_gusta no es true/false
//   404 -> le sacás el me gusta a una canción que no está en la biblioteca,
//          o la canción no existe en Deezer
//   502 -> Deezer no respondió (solo cuando hay que agregar la canción)
router.put('/library/:deezerId/like', requireAuth, libraryController.like);

// ---------- Reseñas ----------
// Listar las de una canción es público; crear, editar y borrar piden token

// GET /api/songs/:deezerId/reviews   (pública)
// Lista las reseñas que dejaron los usuarios sobre una canción.
//   200 -> { total, resenas }
//   400 -> el deezerId no es un número entero positivo
router.get('/songs/:deezerId/reviews', reviewController.listBySong);

// POST /api/songs/:deezerId/reviews   body: { texto }   (con token)
// Escribe una reseña sobre una canción. Cada usuario puede dejar una sola por canción.
//   201 -> se creó: { resena }
//   400 -> deezerId inválido, o texto vacío / de más de 1000 caracteres
//   404 -> esa canción no existe en Deezer
//   409 -> ya habías reseñado esta canción
//   502 -> Deezer no respondió o devolvió un error
router.post('/songs/:deezerId/reviews', requireAuth, reviewController.create);

// PUT /api/reviews/:idResena   body: { texto }   (con token)
// Edita el texto de una reseña propia.
//   200 -> { resena }   (ya editada)
//   400 -> idResena inválido, o texto vacío / de más de 1000 caracteres
//   403 -> la reseña es de otro usuario
//   404 -> la reseña no existe
router.put('/reviews/:idResena', requireAuth, reviewController.update);

// DELETE /api/reviews/:idResena   (con token)
// Borra una reseña propia.
//   204 -> se borró (la respuesta no tiene cuerpo)
//   400 -> idResena inválido
//   403 -> la reseña es de otro usuario
//   404 -> la reseña no existe
router.delete('/reviews/:idResena', requireAuth, reviewController.remove);

// ---------- Playlists del usuario logueado (todas piden token) ----------
// Son privadas: si la playlist no existe o es de otro usuario se responde 404 igual,
// así no se revela que existe.

// GET /api/playlists
// Lista las playlists del usuario.
//   200 -> { total, playlists }
router.get('/playlists', requireAuth, playlistController.list);

// POST /api/playlists   body: { nombre, descripcion?, portada_url? }
// Crea una playlist nueva y registra la actividad.
//   201 -> se creó: { playlist }
//   400 -> nombre vacío o de más de 100 caracteres, descripcion de más de 300,
//          o portada_url no es una URL http/https de hasta 500 caracteres
//   409 -> ya tenés una playlist con ese nombre
router.post('/playlists', requireAuth, playlistController.create);

// GET /api/playlists/:idPlaylist
// Detalle de una playlist con sus canciones en orden.
//   200 -> { playlist }   (incluye cantidad_canciones y canciones)
//   400 -> idPlaylist inválido
//   404 -> la playlist no existe o no es tuya
router.get('/playlists/:idPlaylist', requireAuth, playlistController.getOne);

// PATCH /api/playlists/:idPlaylist   body: { nombre?, descripcion?, portada_url? }   (al menos uno)
// Edita solo los campos que se mandan. descripcion o portada_url en null las borran.
//   200 -> { playlist }   (ya editada)
//   400 -> idPlaylist inválido, no se mandó ningún campo, o algún campo es inválido
//   404 -> la playlist no existe o no es tuya
//   409 -> ya tenés otra playlist con ese nombre
router.patch('/playlists/:idPlaylist', requireAuth, playlistController.update);

// DELETE /api/playlists/:idPlaylist
// Borra una playlist (las canciones no se borran de la biblioteca).
//   204 -> se borró (la respuesta no tiene cuerpo)
//   400 -> idPlaylist inválido
//   404 -> la playlist no existe o no es tuya
router.delete('/playlists/:idPlaylist', requireAuth, playlistController.remove);

// POST /api/playlists/:idPlaylist/songs   body: { deezer_id }
// Agrega una canción al final de la playlist. No hace falta que esté en la biblioteca,
// solo que exista en Deezer.
//   201 -> se agregó: { cancion }
//   400 -> idPlaylist o deezer_id inválidos
//   404 -> la playlist no existe o no es tuya, o la canción no existe en Deezer
//   409 -> la canción ya está en esta playlist
//   502 -> Deezer no respondió o devolvió un error
router.post('/playlists/:idPlaylist/songs', requireAuth, playlistController.addSong);

// DELETE /api/playlists/:idPlaylist/songs/:deezerId
// Saca una canción de la playlist (las que estaban después suben un lugar).
//   204 -> se quitó (la respuesta no tiene cuerpo)
//   400 -> idPlaylist o deezerId inválidos
//   404 -> la playlist no existe o no es tuya, o la canción no está en la playlist
router.delete('/playlists/:idPlaylist/songs/:deezerId', requireAuth, playlistController.removeSong);

// ---------- Actividad ----------

// GET /api/activity?limite=20   (con token; máximo 100)
// Lo último que hizo el usuario: canciones agregadas, reseñas, etc.
//   200 -> { total, actividad }
//   400 -> limite no es un entero entre 1 y 100
router.get('/activity', requireAuth, activityController.list);

// ---------- Perfil del usuario logueado ----------

// GET /api/profile   (con token)
// Todo lo que muestra la pantalla de perfil en un solo pedido.
//   200 -> { usuario, stats, generos, favoritos, resenas }
//   404 -> el usuario no se encontró
router.get('/profile', requireAuth, profileController.getPerfil);

// PUT /api/profile   body: { nombre?, bio?, avatarUrl?, generos? }   (con token)
// Edita el perfil. Hace lo mismo que PATCH /api/profile (ver profile.routes.js).
//   200 -> { usuario }   (los datos ya actualizados)
//   400 -> algún campo es inválido (nombre vacío o muy largo, bio > 300, avatarUrl > 500, más de 10 géneros...)
router.put('/profile', requireAuth, profileController.updatePerfil);

// El resto de las rutas están comentadas en su propio archivo
router.use('/songs', songRoutes); // búsqueda y detalle de canciones
router.use('/home', homeRoutes); // pantalla Home
router.use('/profile', profileRoutes); // PATCH /api/profile
router.use('/stats', statsRoutes); // estadísticas

export default router;
