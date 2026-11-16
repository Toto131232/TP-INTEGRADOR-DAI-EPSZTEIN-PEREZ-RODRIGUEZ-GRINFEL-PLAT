// Prueba todos los endpoints de playlists.   Uso: npm run test:playlists
//
// Levanta la app en un puerto libre, crea dos usuarios temporales (A y B) con el register,
// prueba los casos correctos y los de error, y al final borra esos usuarios
// (ON DELETE CASCADE borra también sus playlists y su actividad).
// Necesita la migración 02 (skmusic_migracion_02_playlists.sql) aplicada en la BD.
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import pool, { query, withTransaction } from '../src/config/db.js';
import * as playlistRepository from '../src/repositories/playlist.repository.js';
import * as activityRepository from '../src/repositories/activity.repository.js';

const SONG_1 = 3135556; // Harder, Better, Faster, Stronger - Daft Punk
const SONG_2 = 1741494317; // Tití Me Preguntó - Bad Bunny
const SONG_3 = 13791930; // Smells Like Teen Spirit - Nirvana
const SONG_4 = 908604612; // Blinding Lights - The Weeknd
const SONG_5 = 1124841682; // Levitating - Dua Lipa
const SONG_NOT_IN_DEEZER = 999999999999;
const PLAYLIST_NOT_FOUND = 999999999;

let baseUrl;
let passed = 0;
let failed = 0;

// Hace un pedido a la API. "auth" es el valor completo del header Authorization.
const api = async (method, path, { auth, body, rawBody } = {}) => {
  const headers = {};
  if (auth) headers.Authorization = auth;
  if (body !== undefined || rawBody !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}${ok ? '' : `  -> ${detail}`}`);
};

// Verifica el código HTTP y muestra el mensaje de error que devolvió la API
const expectStatus = (name, res, status) => {
  const msg = res.body?.error ? ` (${res.body.error})` : '';
  check(`${name} => ${status}${msg}`, res.status === status, `recibió ${res.status} ${JSON.stringify(res.body)}`);
  return res;
};

const countActivity = async (idUsuario) => {
  const { rows } = await query('SELECT COUNT(*) AS total FROM actividad WHERE id_usuario = $1', [idUsuario]);
  return rows[0].total;
};

const registerTestUser = async (letter) => {
  const username = `prueba_${letter}_${Date.now()}`;
  const res = await api('POST', '/auth/register', {
    body: { username, email: `${username}@example.com`, password: 'clave-de-prueba-123' },
  });
  if (res.status !== 201) throw new Error(`No se pudo crear el usuario de prueba: ${JSON.stringify(res.body)}`);
  return { id: res.body.usuario.id_usuario, username, auth: `Bearer ${res.body.token}` };
};

const positions = (playlist) => playlist?.canciones?.map((c) => `${c.posicion}:${c.deezer_id}`).join(' ');

const run = async () => {
  const A = await registerTestUser('a');
  const B = await registerTestUser('b');
  const createdUsers = [A.id, B.id];
  console.log(`Usuarios de prueba: A=${A.id}, B=${B.id}\n`);

  try {
    console.log('--- Autenticación ---');
    const validToken = A.auth.split(' ')[1];
    const otherSecret = jwt.sign({ sub: String(A.id) }, 'otro-secreto-que-no-es-el-del-servidor');
    const expired = jwt.sign({ sub: String(A.id), exp: Math.floor(Date.now() / 1000) - 60 }, env.jwt.secret);
    expectStatus('GET /playlists sin token', await api('GET', '/playlists'), 401);
    expectStatus('GET /playlists token inventado', await api('GET', '/playlists', { auth: 'Bearer abc.def.ghi' }), 401);
    expectStatus('GET /playlists sin "Bearer"', await api('GET', '/playlists', { auth: `Token ${validToken}` }), 401);
    expectStatus('GET /playlists token de otro secreto', await api('GET', '/playlists', { auth: `Bearer ${otherSecret}` }), 401);
    expectStatus('GET /playlists token vencido', await api('GET', '/playlists', { auth: `Bearer ${expired}` }), 401);
    expectStatus('POST /playlists sin token', await api('POST', '/playlists', { body: { nombre: 'x' } }), 401);
    expectStatus('GET /playlists/1 sin token', await api('GET', '/playlists/1'), 401);
    expectStatus('PATCH /playlists/1 sin token', await api('PATCH', '/playlists/1', { body: { nombre: 'x' } }), 401);
    expectStatus('DELETE /playlists/1 sin token', await api('DELETE', '/playlists/1'), 401);
    expectStatus('POST /playlists/1/songs sin token', await api('POST', '/playlists/1/songs', { body: { deezer_id: SONG_1 } }), 401);
    expectStatus('DELETE /playlists/1/songs/1 sin token', await api('DELETE', `/playlists/1/songs/${SONG_1}`), 401);

    console.log('\n--- Crear playlist ---');
    let res = expectStatus(
      'A crea "Mis favoritas" con descripción y portada',
      await api('POST', '/playlists', {
        auth: A.auth,
        body: { nombre: '  Mis favoritas  ', descripcion: ' Las que más escucho ', portada_url: 'https://example.com/tapa.jpg' },
      }),
      201,
    );
    const P1 = res.body?.playlist?.id_playlist;
    check(
      '  guarda los textos sin espacios de más',
      res.body?.playlist?.nombre === 'Mis favoritas' && res.body.playlist.descripcion === 'Las que más escucho' && res.body.playlist.portada_url === 'https://example.com/tapa.jpg',
      JSON.stringify(res.body),
    );

    res = expectStatus('A crea "Sin canciones" (sin descripción ni portada)', await api('POST', '/playlists', { auth: A.auth, body: { nombre: 'Sin canciones', descripcion: '', portada_url: '' } }), 201);
    const P2 = res.body?.playlist?.id_playlist;
    check('  descripcion y portada_url quedan en null', res.body?.playlist?.descripcion === null && res.body.playlist.portada_url === null, JSON.stringify(res.body));

    let activityBefore = await countActivity(A.id);
    expectStatus('A crea "  MIS FAVORITAS " (mismo nombre, otras mayúsculas)', await api('POST', '/playlists', { auth: A.auth, body: { nombre: '  MIS FAVORITAS ' } }), 409);
    check('  el 409 no registró actividad', (await countActivity(A.id)) === activityBefore);

    expectStatus('sin nombre', await api('POST', '/playlists', { auth: A.auth, body: {} }), 400);
    expectStatus('nombre solo espacios', await api('POST', '/playlists', { auth: A.auth, body: { nombre: '   ' } }), 400);
    expectStatus('nombre que no es texto', await api('POST', '/playlists', { auth: A.auth, body: { nombre: 123 } }), 400);
    expectStatus('nombre de 101 caracteres', await api('POST', '/playlists', { auth: A.auth, body: { nombre: 'a'.repeat(101) } }), 400);
    expectStatus('descripcion de 301 caracteres', await api('POST', '/playlists', { auth: A.auth, body: { nombre: 'Otra', descripcion: 'a'.repeat(301) } }), 400);
    expectStatus('descripcion que no es texto', await api('POST', '/playlists', { auth: A.auth, body: { nombre: 'Otra', descripcion: 5 } }), 400);
    expectStatus('portada que no es URL', await api('POST', '/playlists', { auth: A.auth, body: { nombre: 'Otra', portada_url: 'no-es-una-url' } }), 400);
    expectStatus('portada ftp://', await api('POST', '/playlists', { auth: A.auth, body: { nombre: 'Otra', portada_url: 'ftp://example.com/a.jpg' } }), 400);
    expectStatus('portada javascript:', await api('POST', '/playlists', { auth: A.auth, body: { nombre: 'Otra', portada_url: 'javascript:alert(1)' } }), 400);
    expectStatus('portada de 501 caracteres', await api('POST', '/playlists', { auth: A.auth, body: { nombre: 'Otra', portada_url: `https://example.com/${'a'.repeat(481)}` } }), 400);
    expectStatus('JSON mal formado', await api('POST', '/playlists', { auth: A.auth, rawBody: '{"nombre": ' }), 400);

    res = expectStatus('B crea "Mis favoritas" mandando id_usuario de A en el body', await api('POST', '/playlists', { auth: B.auth, body: { nombre: 'Mis favoritas', id_usuario: A.id } }), 201);
    const PB = res.body?.playlist?.id_playlist;

    console.log('\n--- Listar ---');
    res = expectStatus('A lista sus playlists', await api('GET', '/playlists', { auth: A.auth }), 200);
    check('  tiene 2, vacías (cantidad_canciones 0)', res.body?.total === 2 && res.body.playlists.every((p) => p.cantidad_canciones === 0), JSON.stringify(res.body));
    check('  la de B no aparece aunque mandó id_usuario de A', !res.body?.playlists?.some((p) => p.id_playlist === PB), JSON.stringify(res.body));
    res = expectStatus('B lista sus playlists', await api('GET', '/playlists', { auth: B.auth }), 200);
    check('  B solo ve la suya', res.body?.total === 1 && res.body.playlists[0].id_playlist === PB, JSON.stringify(res.body));

    console.log('\n--- Agregar canciones ---');
    res = expectStatus('A agrega SONG_1 a P1', await api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: { deezer_id: SONG_1 } }), 201);
    check('  posición 1 y trae datos de la canción', res.body?.cancion?.posicion === 1 && !!res.body.cancion.titulo && !!res.body.cancion.artista_nombre, JSON.stringify(res.body));
    res = expectStatus('A agrega SONG_2 (como string)', await api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: { deezer_id: String(SONG_2) } }), 201);
    check('  posición 2', res.body?.cancion?.posicion === 2, JSON.stringify(res.body));
    res = expectStatus('A agrega SONG_3', await api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: { deezer_id: SONG_3 } }), 201);
    check('  posición 3', res.body?.cancion?.posicion === 3, JSON.stringify(res.body));

    activityBefore = await countActivity(A.id);
    expectStatus('A agrega SONG_1 otra vez (duplicada)', await api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: { deezer_id: SONG_1 } }), 409);
    check('  el 409 no registró actividad', (await countActivity(A.id)) === activityBefore);
    expectStatus('A agrega SONG_1 a OTRA playlist suya (P2)', await api('POST', `/playlists/${P2}/songs`, { auth: A.auth, body: { deezer_id: SONG_1 } }), 201);

    expectStatus('deezer_id con letras', await api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: { deezer_id: 'abc' } }), 400);
    expectStatus('deezer_id negativo', await api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: { deezer_id: -5 } }), 400);
    expectStatus('deezer_id decimal', await api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: { deezer_id: 3.5 } }), 400);
    expectStatus('body vacío', await api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: {} }), 400);
    expectStatus('canción que no existe en Deezer', await api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: { deezer_id: SONG_NOT_IN_DEEZER } }), 404);
    expectStatus('playlist inexistente', await api('POST', `/playlists/${PLAYLIST_NOT_FOUND}/songs`, { auth: A.auth, body: { deezer_id: SONG_1 } }), 404);
    expectStatus('id_playlist "abc"', await api('POST', '/playlists/abc/songs', { auth: A.auth, body: { deezer_id: SONG_1 } }), 400);
    expectStatus('id_playlist fuera de rango (INT)', await api('POST', '/playlists/99999999999/songs', { auth: A.auth, body: { deezer_id: SONG_1 } }), 400);

    const { rows: libraryRows } = await query('SELECT COUNT(*) AS total FROM biblioteca WHERE id_usuario = $1', [A.id]);
    check('  agregar a una playlist NO la agrega a la biblioteca (no hace falta tenerla)', libraryRows[0].total === 0, JSON.stringify(libraryRows));

    console.log('\n--- Ver detalle ---');
    res = expectStatus('A ve el detalle de P1', await api('GET', `/playlists/${P1}`, { auth: A.auth }), 200);
    const song = res.body?.playlist?.canciones?.[0];
    check('  3 canciones en orden 1, 2, 3', positions(res.body?.playlist) === `1:${SONG_1} 2:${SONG_2} 3:${SONG_3}`, positions(res.body?.playlist));
    check('  cada canción trae título, artista, álbum, portada y duración', ['titulo', 'artista_nombre', 'album_titulo', 'portada_url', 'duracion_seg'].every((k) => k in (song ?? {})), JSON.stringify(song));
    check('  cantidad_canciones = 3', res.body?.playlist?.cantidad_canciones === 3, JSON.stringify(res.body?.playlist?.cantidad_canciones));
    res = expectStatus('A lista sus playlists otra vez', await api('GET', '/playlists', { auth: A.auth }), 200);
    const counts = Object.fromEntries((res.body?.playlists ?? []).map((p) => [p.id_playlist, p.cantidad_canciones]));
    check('  P1 tiene 3 canciones y P2 tiene 1', counts[P1] === 3 && counts[P2] === 1, JSON.stringify(counts));
    expectStatus('detalle de playlist inexistente', await api('GET', `/playlists/${PLAYLIST_NOT_FOUND}`, { auth: A.auth }), 404);
    expectStatus('detalle con id "abc"', await api('GET', '/playlists/abc', { auth: A.auth }), 400);
    expectStatus('detalle con id 0', await api('GET', '/playlists/0', { auth: A.auth }), 400);

    console.log('\n--- Quitar canciones (el orden se mantiene sin huecos) ---');
    expectStatus('A quita SONG_2 (la del medio)', await api('DELETE', `/playlists/${P1}/songs/${SONG_2}`, { auth: A.auth }), 204);
    res = await api('GET', `/playlists/${P1}`, { auth: A.auth });
    check('  quedan 1:SONG_1 y 2:SONG_3', positions(res.body?.playlist) === `1:${SONG_1} 2:${SONG_3}`, positions(res.body?.playlist));
    expectStatus('A quita SONG_2 otra vez', await api('DELETE', `/playlists/${P1}/songs/${SONG_2}`, { auth: A.auth }), 404);
    expectStatus('quitar de playlist inexistente', await api('DELETE', `/playlists/${PLAYLIST_NOT_FOUND}/songs/${SONG_1}`, { auth: A.auth }), 404);
    expectStatus('quitar con deezer_id "abc"', await api('DELETE', `/playlists/${P1}/songs/abc`, { auth: A.auth }), 400);
    res = expectStatus('A vuelve a agregar SONG_2', await api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: { deezer_id: SONG_2 } }), 201);
    check('  va al final (posición 3)', res.body?.cancion?.posicion === 3, JSON.stringify(res.body));

    console.log('\n--- Pedidos al mismo tiempo ---');
    const [r4, r5] = await Promise.all([
      api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: { deezer_id: SONG_4 } }),
      api('POST', `/playlists/${P1}/songs`, { auth: A.auth, body: { deezer_id: SONG_5 } }),
    ]);
    check('dos canciones distintas a la vez => 201 y 201', r4.status === 201 && r5.status === 201, `${r4.status} ${r5.status}`);
    check('  reciben posiciones distintas (4 y 5)', [r4.body?.cancion?.posicion, r5.body?.cancion?.posicion].sort().join() === '4,5', `${r4.body?.cancion?.posicion} ${r5.body?.cancion?.posicion}`);
    const twice = await Promise.all([
      api('POST', `/playlists/${P2}/songs`, { auth: A.auth, body: { deezer_id: SONG_3 } }),
      api('POST', `/playlists/${P2}/songs`, { auth: A.auth, body: { deezer_id: SONG_3 } }),
    ]);
    check('la misma canción dos veces a la vez => una 201 y una 409', twice.map((r) => r.status).sort().join() === '201,409', twice.map((r) => r.status).join());

    console.log('\n--- Editar ---');
    res = expectStatus('A renombra P1 a "Favoritas 2026"', await api('PATCH', `/playlists/${P1}`, { auth: A.auth, body: { nombre: 'Favoritas 2026' } }), 200);
    check('  cambia el nombre y mantiene descripción y portada', res.body?.playlist?.nombre === 'Favoritas 2026' && res.body.playlist.descripcion === 'Las que más escucho' && res.body.playlist.portada_url === 'https://example.com/tapa.jpg', JSON.stringify(res.body));
    res = expectStatus('A borra la descripción (null) y cambia la portada', await api('PATCH', `/playlists/${P1}`, { auth: A.auth, body: { descripcion: null, portada_url: 'http://example.com/otra.png' } }), 200);
    check('  descripcion null y portada nueva', res.body?.playlist?.descripcion === null && res.body.playlist.portada_url === 'http://example.com/otra.png', JSON.stringify(res.body));

    activityBefore = await countActivity(A.id);
    expectStatus('A "edita" sin cambiar nada', await api('PATCH', `/playlists/${P1}`, { auth: A.auth, body: { nombre: 'Favoritas 2026' } }), 200);
    check('  no registró actividad', (await countActivity(A.id)) === activityBefore);
    expectStatus('A renombra P1 como "SIN CANCIONES" (ya la tiene)', await api('PATCH', `/playlists/${P1}`, { auth: A.auth, body: { nombre: 'SIN CANCIONES' } }), 409);
    check('  el 409 no registró actividad', (await countActivity(A.id)) === activityBefore);
    expectStatus('body vacío', await api('PATCH', `/playlists/${P1}`, { auth: A.auth, body: {} }), 400);
    expectStatus('nombre vacío', await api('PATCH', `/playlists/${P1}`, { auth: A.auth, body: { nombre: '' } }), 400);
    expectStatus('nombre null', await api('PATCH', `/playlists/${P1}`, { auth: A.auth, body: { nombre: null } }), 400);
    expectStatus('portada inválida', await api('PATCH', `/playlists/${P1}`, { auth: A.auth, body: { portada_url: 'hola' } }), 400);
    expectStatus('editar playlist inexistente', await api('PATCH', `/playlists/${PLAYLIST_NOT_FOUND}`, { auth: A.auth, body: { nombre: 'x' } }), 404);

    console.log('\n--- Otro usuario (B) no puede ver ni tocar las playlists de A ---');
    expectStatus('B ve el detalle de P1', await api('GET', `/playlists/${P1}`, { auth: B.auth }), 404);
    expectStatus('B renombra P1', await api('PATCH', `/playlists/${P1}`, { auth: B.auth, body: { nombre: 'hackeada' } }), 404);
    expectStatus('B agrega una canción a P1', await api('POST', `/playlists/${P1}/songs`, { auth: B.auth, body: { deezer_id: SONG_2 } }), 404);
    expectStatus('B quita una canción de P1', await api('DELETE', `/playlists/${P1}/songs/${SONG_1}`, { auth: B.auth }), 404);
    expectStatus('B borra P1', await api('DELETE', `/playlists/${P1}`, { auth: B.auth }), 404);
    expectStatus('A ve el detalle de la playlist de B', await api('GET', `/playlists/${PB}`, { auth: A.auth }), 404);
    res = await api('GET', `/playlists/${P1}`, { auth: A.auth });
    check('  P1 de A sigue igual (mismo nombre y 5 canciones)', res.body?.playlist?.nombre === 'Favoritas 2026' && res.body.playlist.cantidad_canciones === 5, JSON.stringify(res.body?.playlist?.nombre));

    console.log('\n--- Borrar ---');
    expectStatus('A borra P1', await api('DELETE', `/playlists/${P1}`, { auth: A.auth }), 204);
    expectStatus('A ve P1 borrada', await api('GET', `/playlists/${P1}`, { auth: A.auth }), 404);
    expectStatus('A borra P1 otra vez', await api('DELETE', `/playlists/${P1}`, { auth: A.auth }), 404);
    expectStatus('borrar con id "abc"', await api('DELETE', '/playlists/abc', { auth: A.auth }), 400);
    const { rows: leftovers } = await query('SELECT COUNT(*) AS total FROM playlist_cancion WHERE id_playlist = $1', [P1]);
    check('  ON DELETE CASCADE borró sus canciones de playlist_cancion', leftovers[0].total === 0, JSON.stringify(leftovers));
    const { rows: cached } = await query('SELECT COUNT(*) AS total FROM cancion WHERE deezer_id = $1', [SONG_1]);
    check('  la canción sigue en la caché (la usan otras playlists)', cached[0].total === 1);

    console.log('\n--- Actividad ---');
    res = expectStatus('A ve su actividad', await api('GET', '/activity?limite=100', { auth: A.auth }), 200);
    const actividad = res.body?.actividad ?? [];
    const types = new Set(actividad.map((a) => a.tipo));
    const expected = ['creo_playlist', 'agrego_a_playlist', 'quito_de_playlist', 'edito_playlist', 'borro_playlist'];
    check(`  registró: ${expected.join(', ')}`, expected.every((t) => types.has(t)), [...types].join(', '));
    const rename = actividad.find((a) => a.tipo === 'edito_playlist' && a.detalle.includes('->'));
    check('  el renombre guarda "antes -> después"', rename?.detalle === 'Mis favoritas -> Favoritas 2026', JSON.stringify(rename));
    const deleted = actividad.find((a) => a.tipo === 'borro_playlist');
    check('  el borrado guarda el nombre (id_playlist queda en null)', deleted?.detalle === 'Favoritas 2026' && deleted.id_playlist === null, JSON.stringify(deleted));
    const addedToP2 = actividad.find((a) => a.tipo === 'agrego_a_playlist' && a.id_playlist === P2);
    check('  agregar guarda canción, playlist y nombre', addedToP2?.deezer_id === SONG_1 && addedToP2.detalle === 'Sin canciones' && !!addedToP2.titulo, JSON.stringify(addedToP2));
    // agrego: 6 a P1 (SONG_1, 2, 3, otra vez 2, 4 y 5) + 2 a P2 (SONG_1 y SONG_3). Los 409 y 404 no cuentan.
    // edito: el renombre + el cambio de descripción/portada (la edición sin cambios no cuenta).
    const byType = actividad.reduce((acc, a) => ({ ...acc, [a.tipo]: (acc[a.tipo] ?? 0) + 1 }), {});
    check(
      '  cantidades: 2 creo, 8 agrego, 1 quito, 2 edito, 1 borro',
      byType.creo_playlist === 2 && byType.agrego_a_playlist === 8 && byType.quito_de_playlist === 1 && byType.edito_playlist === 2 && byType.borro_playlist === 1,
      JSON.stringify(byType),
    );
    res = await api('GET', '/activity', { auth: B.auth });
    check('  B solo ve lo suyo (1 creo_playlist)', res.body?.total === 1 && res.body.actividad[0].tipo === 'creo_playlist', JSON.stringify(res.body));

    console.log('\n--- Transacción: si algo falla en el medio, no se guarda nada ---');
    try {
      await withTransaction(async (db) => {
        await playlistRepository.create(db, A.id, { nombre: 'No debería existir', descripcion: null, portada_url: null }); // sale bien...
        await activityRepository.create(db, { idUsuario: A.id, tipo: 'tipo_invalido' }); // ...y esto falla (CHECK)
      });
      check('la transacción tenía que fallar', false, 'no falló');
    } catch (err) {
      check(`la transacción falló como se esperaba (${err.code} ${err.constraint})`, err.code === '23514');
    }
    const { rows: ghost } = await query('SELECT COUNT(*) AS total FROM playlist WHERE id_usuario = $1 AND nombre = $2', [A.id, 'No debería existir']);
    check('  la playlist NO quedó guardada (se hizo ROLLBACK)', ghost[0].total === 0);
  } finally {
    await query('DELETE FROM usuario WHERE id_usuario = ANY($1)', [createdUsers]);
    console.log(`\nUsuarios de prueba borrados (${createdUsers.join(', ')})`);
  }
};

const server = app.listen(0, async () => {
  baseUrl = `http://localhost:${server.address().port}/api`;
  try {
    await run();
  } catch (err) {
    failed++;
    console.error('Error inesperado:', err);
  } finally {
    console.log(`\nResultado: ${passed} OK, ${failed} fallas`);
    process.exitCode = failed > 0 ? 1 : 0;
    server.close();
    await pool.end();
  }
});
