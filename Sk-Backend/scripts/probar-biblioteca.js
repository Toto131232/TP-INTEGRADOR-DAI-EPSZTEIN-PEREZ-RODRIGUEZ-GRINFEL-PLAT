// Prueba todos los endpoints de biblioteca, reseñas y actividad.   Uso: npm run test:biblioteca
//
// Levanta la app en un puerto libre, crea dos usuarios temporales (A y B) con el register,
// prueba los casos correctos y los de error, y al final borra esos usuarios
// (ON DELETE CASCADE borra también su biblioteca, reseñas y actividad).
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import pool, { query, withTransaction } from '../src/config/db.js';
import * as libraryRepository from '../src/repositories/library.repository.js';
import * as activityRepository from '../src/repositories/activity.repository.js';

const SONG_1 = 3135556; // Harder, Better, Faster, Stronger - Daft Punk
const SONG_2 = 1741494317; // Tití Me Preguntó - Bad Bunny
const SONG_NOT_ADDED = 13791930; // Smells Like Teen Spirit - Nirvana (no se agrega)
const SONG_NOT_IN_DEEZER = 999999999999;

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
    expectStatus('GET /library sin token', await api('GET', '/library'), 401);
    expectStatus('GET /library token inventado', await api('GET', '/library', { auth: 'Bearer abc.def.ghi' }), 401);
    expectStatus('GET /library sin "Bearer"', await api('GET', '/library', { auth: `Token ${validToken}` }), 401);
    expectStatus('GET /library token de otro secreto', await api('GET', '/library', { auth: `Bearer ${otherSecret}` }), 401);
    expectStatus('GET /library token vencido', await api('GET', '/library', { auth: `Bearer ${expired}` }), 401);
    expectStatus('POST /library sin token', await api('POST', '/library', { body: { deezer_id: SONG_1 } }), 401);
    expectStatus('POST reseña sin token', await api('POST', `/songs/${SONG_1}/reviews`, { body: { texto: 'x' } }), 401);
    expectStatus('PUT /reviews/1 sin token', await api('PUT', '/reviews/1', { body: { texto: 'x' } }), 401);
    expectStatus('GET /activity sin token', await api('GET', '/activity'), 401);

    console.log('\n--- Agregar a la biblioteca ---');
    let res = expectStatus('A agrega SONG_1', await api('POST', '/library', { auth: A.auth, body: { deezer_id: SONG_1 } }), 201);
    check('  queda en "quiero_escuchar" y trae datos de la canción', res.body?.cancion?.estado === 'quiero_escuchar' && !!res.body?.cancion?.titulo, JSON.stringify(res.body));

    const activityBefore = await countActivity(A.id);
    expectStatus('A agrega SONG_1 otra vez (duplicado)', await api('POST', '/library', { auth: A.auth, body: { deezer_id: SONG_1 } }), 409);
    check('  el 409 no registró actividad', (await countActivity(A.id)) === activityBefore);

    res = expectStatus('A agrega SONG_2 como "escuchando" (como string)', await api('POST', '/library', { auth: A.auth, body: { deezer_id: String(SONG_2), estado: 'escuchando' } }), 201);
    check('  estado "escuchando"', res.body?.cancion?.estado === 'escuchando', JSON.stringify(res.body));
    expectStatus('deezer_id con letras', await api('POST', '/library', { auth: A.auth, body: { deezer_id: 'abc' } }), 400);
    expectStatus('deezer_id negativo', await api('POST', '/library', { auth: A.auth, body: { deezer_id: -5 } }), 400);
    expectStatus('deezer_id decimal', await api('POST', '/library', { auth: A.auth, body: { deezer_id: 3.5 } }), 400);
    expectStatus('body vacío', await api('POST', '/library', { auth: A.auth, body: {} }), 400);
    expectStatus('estado "favorito" (ya no existe)', await api('POST', '/library', { auth: A.auth, body: { deezer_id: SONG_NOT_ADDED, estado: 'favorito' } }), 400);
    expectStatus('canción que no existe en Deezer', await api('POST', '/library', { auth: A.auth, body: { deezer_id: SONG_NOT_IN_DEEZER } }), 404);
    expectStatus('JSON mal formado', await api('POST', '/library', { auth: A.auth, rawBody: '{"deezer_id": ' }), 400);

    console.log('\n--- Listar y filtrar ---');
    res = expectStatus('A lista su biblioteca', await api('GET', '/library', { auth: A.auth }), 200);
    check('  tiene 2 canciones', res.body?.total === 2, JSON.stringify(res.body));
    res = expectStatus('filtro estado=escuchando', await api('GET', '/library?estado=escuchando', { auth: A.auth }), 200);
    check('  devuelve solo SONG_2', res.body?.total === 1 && res.body.canciones[0].deezer_id === SONG_2, JSON.stringify(res.body));
    expectStatus('filtro estado=favorito', await api('GET', '/library?estado=favorito', { auth: A.auth }), 400);
    expectStatus('filtro puntuacion_min=9', await api('GET', '/library?puntuacion_min=9', { auth: A.auth }), 400);
    expectStatus('orden=nombre', await api('GET', '/library?orden=nombre', { auth: A.auth }), 400);
    expectStatus('direccion=arriba', await api('GET', '/library?direccion=arriba', { auth: A.auth }), 400);
    expectStatus('GET /library/SONG_1', await api('GET', `/library/${SONG_1}`, { auth: A.auth }), 200);
    expectStatus('GET canción que no está en su biblioteca', await api('GET', `/library/${SONG_NOT_ADDED}`, { auth: A.auth }), 404);
    expectStatus('GET /library/abc', await api('GET', '/library/abc', { auth: A.auth }), 400);

    console.log('\n--- Cambiar estado ---');
    res = expectStatus('A pasa SONG_1 a "escuchado"', await api('PATCH', `/library/${SONG_1}/status`, { auth: A.auth, body: { estado: 'escuchado' } }), 200);
    check('  estado "escuchado"', res.body?.cancion?.estado === 'escuchado', JSON.stringify(res.body));
    expectStatus('estado "favorito"', await api('PATCH', `/library/${SONG_1}/status`, { auth: A.auth, body: { estado: 'favorito' } }), 400);
    expectStatus('sin estado', await api('PATCH', `/library/${SONG_1}/status`, { auth: A.auth, body: {} }), 400);
    expectStatus('canción que no está en su biblioteca', await api('PATCH', `/library/${SONG_NOT_ADDED}/status`, { auth: A.auth, body: { estado: 'escuchado' } }), 404);

    console.log('\n--- Puntuar ---');
    res = expectStatus('A puntúa SONG_1 con 4', await api('PUT', `/library/${SONG_1}/rating`, { auth: A.auth, body: { puntuacion: 4 } }), 200);
    check('  puntuacion 4', res.body?.cancion?.puntuacion === 4, JSON.stringify(res.body));
    res = expectStatus('A cambia la puntuación a 5', await api('PUT', `/library/${SONG_1}/rating`, { auth: A.auth, body: { puntuacion: 5 } }), 200);
    check('  puntuacion 5', res.body?.cancion?.puntuacion === 5, JSON.stringify(res.body));
    for (const bad of [6, 0, 3.5, '4', null]) {
      expectStatus(`puntuacion ${JSON.stringify(bad)}`, await api('PUT', `/library/${SONG_1}/rating`, { auth: A.auth, body: { puntuacion: bad } }), 400);
    }
    expectStatus('puntuar canción que no está en su biblioteca', await api('PUT', `/library/${SONG_NOT_ADDED}/rating`, { auth: A.auth, body: { puntuacion: 3 } }), 404);
    res = expectStatus('filtro puntuacion_min=5&orden=puntuacion', await api('GET', '/library?puntuacion_min=5&orden=puntuacion', { auth: A.auth }), 200);
    check('  devuelve solo SONG_1', res.body?.total === 1 && res.body.canciones[0].deezer_id === SONG_1, JSON.stringify(res.body));
    res = expectStatus('orden=puntuacion&direccion=asc', await api('GET', '/library?orden=puntuacion&direccion=asc', { auth: A.auth }), 200);
    check('  la puntuada va primero y la sin puntuar al final', res.body?.canciones?.[0]?.deezer_id === SONG_1 && res.body.canciones[1].puntuacion === null, JSON.stringify(res.body));

    console.log('\n--- Otro usuario (B) no puede ver ni tocar la biblioteca de A ---');
    res = expectStatus('B lista su biblioteca', await api('GET', '/library', { auth: B.auth }), 200);
    check('  B no ve las canciones de A', res.body?.total === 0, JSON.stringify(res.body));
    expectStatus('B pide SONG_1 de A', await api('GET', `/library/${SONG_1}`, { auth: B.auth }), 404);
    expectStatus('B cambia el estado de SONG_1', await api('PATCH', `/library/${SONG_1}/status`, { auth: B.auth, body: { estado: 'escuchando' } }), 404);
    expectStatus('B puntúa SONG_1', await api('PUT', `/library/${SONG_1}/rating`, { auth: B.auth, body: { puntuacion: 1 } }), 404);
    expectStatus('B borra SONG_1', await api('DELETE', `/library/${SONG_1}`, { auth: B.auth }), 404);
    res = await api('GET', `/library/${SONG_1}`, { auth: A.auth });
    check('  la canción de A sigue igual (escuchado, 5 estrellas)', res.body?.cancion?.estado === 'escuchado' && res.body.cancion.puntuacion === 5, JSON.stringify(res.body));

    console.log('\n--- Reseñas ---');
    expectStatus('texto vacío', await api('POST', `/songs/${SONG_1}/reviews`, { auth: A.auth, body: { texto: '' } }), 400);
    expectStatus('texto solo espacios', await api('POST', `/songs/${SONG_1}/reviews`, { auth: A.auth, body: { texto: '    ' } }), 400);
    expectStatus('sin texto', await api('POST', `/songs/${SONG_1}/reviews`, { auth: A.auth, body: {} }), 400);
    expectStatus('texto de 1001 caracteres', await api('POST', `/songs/${SONG_1}/reviews`, { auth: A.auth, body: { texto: 'a'.repeat(1001) } }), 400);
    expectStatus('reseña de canción inexistente en Deezer', await api('POST', `/songs/${SONG_NOT_IN_DEEZER}/reviews`, { auth: A.auth, body: { texto: 'Hola' } }), 404);
    res = expectStatus('A crea una reseña', await api('POST', `/songs/${SONG_1}/reviews`, { auth: A.auth, body: { texto: '  Temazo.  ' } }), 201);
    const reviewId = res.body?.resena?.id_resena;
    check('  guarda el texto sin espacios de más', res.body?.resena?.texto === 'Temazo.', JSON.stringify(res.body));
    expectStatus('A crea otra reseña para la misma canción', await api('POST', `/songs/${SONG_1}/reviews`, { auth: A.auth, body: { texto: 'Otra' } }), 409);

    res = expectStatus('listar reseñas SIN token (pública)', await api('GET', `/songs/${SONG_1}/reviews`), 200);
    const listed = res.body?.resenas?.find((r) => r.id_resena === reviewId);
    check('  aparece la reseña con el username del autor', listed?.username === A.username, JSON.stringify(res.body));
    check('  no expone email ni password_hash', !JSON.stringify(res.body).includes('email') && !JSON.stringify(res.body).includes('password'));

    expectStatus('B edita la reseña de A', await api('PUT', `/reviews/${reviewId}`, { auth: B.auth, body: { texto: 'hackeado' } }), 403);
    expectStatus('B borra la reseña de A', await api('DELETE', `/reviews/${reviewId}`, { auth: B.auth }), 403);
    res = await api('GET', `/songs/${SONG_1}/reviews`);
    check('  la reseña de A sigue intacta', res.body?.resenas?.find((r) => r.id_resena === reviewId)?.texto === 'Temazo.', JSON.stringify(res.body));
    expectStatus('editar reseña inexistente', await api('PUT', '/reviews/999999999', { auth: A.auth, body: { texto: 'x' } }), 404);
    expectStatus('editar reseña con id "abc"', await api('PUT', '/reviews/abc', { auth: A.auth, body: { texto: 'x' } }), 400);
    expectStatus('editar reseña con id fuera de rango', await api('PUT', '/reviews/99999999999', { auth: A.auth, body: { texto: 'x' } }), 400);
    expectStatus('A edita su reseña con texto vacío', await api('PUT', `/reviews/${reviewId}`, { auth: A.auth, body: { texto: ' ' } }), 400);
    res = expectStatus('A edita su reseña', await api('PUT', `/reviews/${reviewId}`, { auth: A.auth, body: { texto: 'Temazo, la escucho todos los días.' } }), 200);
    check('  queda la fecha de edición', !!res.body?.resena?.editada_en, JSON.stringify(res.body));
    expectStatus('B reseña la misma canción (sin tenerla en su biblioteca)', await api('POST', `/songs/${SONG_1}/reviews`, { auth: B.auth, body: { texto: 'Muy buena' } }), 201);
    expectStatus('A borra su reseña', await api('DELETE', `/reviews/${reviewId}`, { auth: A.auth }), 204);
    expectStatus('A borra su reseña otra vez', await api('DELETE', `/reviews/${reviewId}`, { auth: A.auth }), 404);

    console.log('\n--- Quitar de la biblioteca ---');
    expectStatus('A quita SONG_2', await api('DELETE', `/library/${SONG_2}`, { auth: A.auth }), 204);
    expectStatus('A quita SONG_2 otra vez', await api('DELETE', `/library/${SONG_2}`, { auth: A.auth }), 404);
    expectStatus('DELETE /library/abc', await api('DELETE', '/library/abc', { auth: A.auth }), 400);

    console.log('\n--- Actividad ---');
    res = expectStatus('A ve su actividad', await api('GET', '/activity?limite=50', { auth: A.auth }), 200);
    const types = new Set(res.body?.actividad?.map((a) => a.tipo));
    const expected = ['agrego_cancion', 'cambio_estado', 'puntuo', 'reseno', 'edito_resena', 'quito_cancion'];
    check(`  registró: ${expected.join(', ')}`, expected.every((t) => types.has(t)), [...types].join(', '));
    const statusChange = res.body?.actividad?.find((a) => a.tipo === 'cambio_estado');
    check('  el cambio de estado guarda el detalle', statusChange?.detalle === 'quiero_escuchar -> escuchado', JSON.stringify(statusChange));
    res = expectStatus('B ve su actividad', await api('GET', '/activity', { auth: B.auth }), 200);
    check('  B solo ve lo suyo (1 reseña)', res.body?.total === 1 && res.body.actividad[0].tipo === 'reseno', JSON.stringify(res.body));
    expectStatus('limite=0', await api('GET', '/activity?limite=0', { auth: A.auth }), 400);
    expectStatus('limite=abc', await api('GET', '/activity?limite=abc', { auth: A.auth }), 400);

    console.log('\n--- Transacción: si algo falla en el medio, no se guarda nada ---');
    try {
      await withTransaction(async (db) => {
        await libraryRepository.create(db, A.id, SONG_2, 'escuchado'); // esto sale bien...
        await activityRepository.create(db, { idUsuario: A.id, tipo: 'tipo_invalido' }); // ...y esto falla (CHECK)
      });
      check('la transacción tenía que fallar', false, 'no falló');
    } catch (err) {
      check(`la transacción falló como se esperaba (${err.code} ${err.constraint})`, err.code === '23514');
    }
    check('  SONG_2 NO quedó en la biblioteca (se hizo ROLLBACK)', (await libraryRepository.findOne(A.id, SONG_2)) === null);
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
