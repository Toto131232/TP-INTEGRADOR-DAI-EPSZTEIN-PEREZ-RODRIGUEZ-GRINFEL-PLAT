# Informe: Playlists (backend + frontend)

Rama: `Augusto2`. No se hizo ningún commit ni se cambió de rama. El código viejo de playlists de la rama `Feli-Plat` se leyó con `git show` (solo lectura) y se usó como base.

---

## 1. Resumen

Ahora el usuario puede:

- **ver** sus playlists en *Tu biblioteca → Playlists*, con portada, nombre y cantidad de canciones;
- **crear** una playlist con nombre, descripción y portada (las dos últimas son opcionales);
- **editar** el nombre, la descripción y la portada, y también **borrar** la descripción o la portada;
- **borrar** una playlist (con confirmación);
- **ver el detalle**: portada grande, nombre, "de usuario · N canciones · X min" y la lista numerada;
- **agregar canciones** desde *Buscar* (botón "+" en cada resultado), incluso creando una playlist nueva en el momento;
- **quitar canciones** (con confirmación). Las demás se reacomodan solas (1, 2, 3… sin huecos).

Todo se guarda en PostgreSQL por medio del backend, así que sigue ahí aunque cierres sesión. Cada acción queda registrada en la tabla `actividad`.

**Lo que no se hizo, a propósito:** el reproductor (barra de abajo, botón dorado de play), porque estaba fuera de alcance.

---

## 2. Archivos creados y modificados

### Backend (`Sk-Backend/`)

| Archivo | Nuevo / modificado | Qué tiene o qué cambió |
|---|---|---|
| `src/controllers/playlist.controller.js` | Nuevo | Valida lo que llega (`parseId`, nombre, descripción, portada) y arma la respuesta (`{ playlist }`, `{ total, playlists }`, `{ cancion }` o 204). |
| `src/services/playlist.service.js` | Nuevo | Reglas de negocio: que la playlist sea del usuario (si no, 404), los 409, las transacciones, la posición de cada canción y la actividad. |
| `src/repositories/playlist.repository.js` | Nuevo | Solo SQL con parámetros (`$1`, `$2`…). `FOR UPDATE` para bloquear la playlist. |
| `scripts/probar-playlists.js` | Nuevo | Pruebas automáticas (113 casos). Se corre con `npm run test:playlists`. |
| `src/routes/index.js` | Modificado | +1 import y las 7 rutas de playlists, todas con `requireAuth`. |
| `src/repositories/activity.repository.js` | Modificado | `create` acepta un parámetro opcional `idPlaylist = null`. Las llamadas que ya existían (biblioteca, reseñas) siguen funcionando igual, porque si no lo mandan queda en `null`. |
| `package.json` | Modificado | Script `"test:playlists"`. |
| `scripts/seed-demo.js` | Modificado | Agrega 3 playlists a la cuenta demo, más una playlist temporal que se crea y se borra (ver §9). |

### Base de datos (raíz del repo)

| Archivo | Qué tiene |
|---|---|
| `skmusic_migracion_03_playlists.sql` | Nuevo. Portada, nombres sin repetir y 2 tipos de actividad (ver §3). |

### Frontend (`Sk-Frontend/`)

| Archivo | Nuevo / modificado | Qué tiene o qué cambió |
|---|---|---|
| `src/api/playlists.js` | Nuevo | Una función por endpoint, usando `client.js`. |
| `src/formato.js` | Nuevo | `duracion` (m:ss), `duracionTotal` ("48 min"), `cantidadCanciones`, `iniciales` y `aFormatoBuscador`. |
| `src/screens/PlaylistsTab.js` | Nuevo | Pestaña Playlists: card "Crear playlist", lista, borrar con confirmación y estados vacío, error y carga. |
| `src/screens/PlaylistDetailScreen.js` | Nuevo | Detalle: cabecera azul, botones editar, borrar y "+ Agregar", lista numerada y quitar canción. |
| `src/components/PlaylistCover.js` | Nuevo | Portada: la imagen, o un mosaico 2x2 de colores que sale del id. |
| `src/components/PlaylistForm.js` | Nuevo | Formulario de crear y editar: valida, llama al backend y muestra el 409 debajo del nombre. |
| `src/components/PlaylistRow.js` | Nuevo | Fila de la lista de playlists. |
| `src/components/PlaylistSongRow.js` | Nuevo | Fila numerada de una canción, con portada o cuadrado con iniciales. |
| `src/components/AddToPlaylistSheet.js` | Nuevo | Panel "Agregar a playlist" (reutilizable). |
| `src/components/ConfirmSheet.js` | Nuevo | Confirmación genérica (mismo diseño que la de la biblioteca). |
| `src/components/ScreenStates.js` | Nuevo | `Cargando`, `Vacio`, `ErrorBox` y `Aviso`, con el mismo estilo que la pestaña Canciones. |
| `App.js` | Modificado | 2 `useState` en `MainApp` (sección de la biblioteca y playlist abierta) y el `case 'biblioteca'` muestra el detalle o la biblioteca. |
| `src/screens/LibraryScreen.js` | Modificado | La sección elegida ahora viene de `App.js` (props `seccion`, `onChangeSeccion`), y "Próximamente" de Playlists se reemplazó por `<PlaylistsTab>`. La pestaña Canciones no se tocó. |
| `src/screens/SearchScreen.js` | Modificado | Botón "+" al lado de cada resultado, que abre `AddToPlaylistSheet`. `SongItem` **no** se tocó. |
| `src/theme.js` | Modificado | `colors.headerBlue` (azul de la cabecera) y `coverColors` (7 colores para mosaicos e iniciales). |
| `src/components/BottomSheet.js` | Modificado | `KeyboardAvoidingView` (en iOS el teclado no tapa el formulario) y `maxHeight: '90%'` (si la lista es larga, se scrollea adentro del panel). Los paneles que ya existían se ven igual. |

### Archivo local (no va a git)

- `Sk-Backend/.env`: se cambió **solo** `DB_NAME` a `skmusic_db`, con tu autorización, porque la base `skmusic_db_v2` no existe en tu PostgreSQL.

---

## 3. Migración `skmusic_migracion_03_playlists.sql`

Se corre una vez, después de `skmusic_db_v2.sql` y de la migración 01. Tiene `BEGIN/COMMIT` (o se aplica toda o nada) y **se puede volver a correr** sin error: se probó dos veces seguidas.

| Qué agrega | Por qué |
|---|---|
| `ALTER TABLE playlist ADD COLUMN IF NOT EXISTS portada_url TEXT` | La consigna pide poder poner una portada. `IF NOT EXISTS` permite volver a correrla. |
| `UPDATE` que renombra nombres repetidos ("Rock (7)") | El índice único no se puede crear si ya hay nombres repetidos. Es lo mismo que hace la migración 01 con `favorito` antes de cambiar el CHECK. |
| `CREATE UNIQUE INDEX ux_playlist_usuario_nombre ON playlist (id_usuario, LOWER(nombre))` | Un usuario no puede tener dos playlists con el mismo nombre. `LOWER` hace que "Rock" y "rock" choquen. Como el índice incluye `id_usuario`, **otro** usuario sí puede usar "Rock". |
| Se borra y se vuelve a crear `actividad_tipo_check` con 11 tipos | Se suman `edito_playlist` y `quito_de_playlist`, y se mantienen los 9 que ya existían. |

**Por qué un índice y no solo un control en el código:** si llegan dos pedidos iguales al mismo tiempo, los dos podrían pasar un `SELECT` de control. El índice lo frena la base, que es la última palabra. El service atrapa ese error (código `23505`) y responde 409.

El número 02 no se usó porque lo tiene Toto en su rama (`skmusic_migracion_02_me_gusta.sql`). Esa migración no toca `actividad`, así que no choca con esta.

---

## 4. Endpoints

Todas las rutas empiezan con `/api` y **todas piden** `Authorization: Bearer <token>`. Los errores siempre vienen como `{ "error": "mensaje" }`.

| Método | Ruta | Body | Respuesta OK | Errores |
|---|---|---|---|---|
| POST | `/playlists` | `{ nombre, descripcion?, portada_url? }` | **201** `{ playlist: { id_playlist, nombre, descripcion, portada_url, creada_en } }` | 400 datos inválidos o JSON mal formado · 401 · 409 "Ya tenés una playlist con ese nombre" |
| GET | `/playlists` | — | **200** `{ total, playlists: [{ id_playlist, nombre, descripcion, portada_url, creada_en, cantidad_canciones }] }` (las más nuevas primero) | 401 |
| GET | `/playlists/:idPlaylist` | — | **200** `{ playlist: { …lo mismo, cantidad_canciones, canciones: [{ posicion, agregada_en, deezer_id, titulo, artista_nombre, album_titulo, portada_url, duracion_seg }] } }` (ordenadas por posición) | 400 id inválido · 401 · 404 "Playlist no encontrada" |
| PATCH | `/playlists/:idPlaylist` | Uno o más de `nombre`, `descripcion`, `portada_url` (`null` o `""` borra la descripción o la portada) | **200** `{ playlist }` | 400 (id, campos o body vacío) · 401 · 404 · 409 nombre repetido |
| DELETE | `/playlists/:idPlaylist` | — | **204** (sin cuerpo) | 400 · 401 · 404 |
| POST | `/playlists/:idPlaylist/songs` | `{ deezer_id }` | **201** `{ cancion: { posicion, agregada_en, deezer_id, titulo, artista_nombre, album_titulo, portada_url, duracion_seg } }` | 400 · 401 · 404 (playlist, o canción que no existe en Deezer) · 409 "La canción ya está en esta playlist" · 502 Deezer caído |
| DELETE | `/playlists/:idPlaylist/songs/:deezerId` | — | **204** | 400 · 401 · 404 (playlist, o "La canción no está en esta playlist") |

**Validaciones** (iguales en el backend y en el formulario del front):

- `nombre`: se recortan los espacios del principio y del final; entre 1 y 100 caracteres.
- `descripcion`: hasta 300 caracteres; vacía = `null`.
- `portada_url`: `http://` o `https://`, hasta 500 caracteres; vacía = `null`. En el backend se controla con `new URL()`, así que no entra `javascript:` ni `ftp:`.
- `idPlaylist`: entero entre 1 y 2147483647 (el máximo de un `INT`). `deezer_id`: entero positivo.

**Los 401 posibles:** "Falta el token de autenticación", "Token inválido o expirado" y "El usuario del token ya no existe".

**Números como número:** `cantidad_canciones` sale de un `COUNT` (BIGINT) y `deezer_id` es BIGINT. `config/db.js` ya convierte los BIGINT a número, así que llegan `3` y no `"3"`. Las pruebas lo controlan.

---

## 5. Cómo funciona el backend

### Recorrido de una request: `POST /api/playlists/7/songs` con `{ "deezer_id": 3135556 }`

1. **Route** (`routes/index.js`): `router.post('/playlists/:idPlaylist/songs', requireAuth, playlistController.addSong)`.
2. **requireAuth**: lee el header `Authorization`, verifica el JWT y que el usuario siga existiendo, y deja `req.user = { id, username }`. Sin token válido corta con 401.
3. **Controller** (`addSong`): `parseId` convierte `"7"` y `3135556` en números, o corta con 400. El id del usuario sale **siempre** de `req.user.id`, nunca del body ni de la URL.
4. **Service** (`addSong`):
   - `getOwn`: busca la playlist 7 **de ese usuario**. Si no existe o es de otro usuario: 404.
   - `hasSong`: si la canción ya está, 409. Así no se llama a Deezer de gusto.
   - `songService.getSongData`: busca la canción en la caché o en Deezer, **antes** de abrir la transacción, para no dejarla abierta mientras se espera una respuesta de internet.
   - `withTransaction`: `lockOwn` (otra vez la playlist, ahora con `FOR UPDATE`), guarda la canción en la caché (`songRepository.create`, que no hace nada si ya estaba), calcula `MAX(posicion) + 1`, inserta en `playlist_cancion` y registra la actividad `agrego_a_playlist`. Si algo falla, se deshace todo (`ROLLBACK`).
5. **Repository**: cada función es un `SELECT`, `INSERT`, `UPDATE` o `DELETE` con parámetros `$1`, `$2`…, nunca concatenando texto (así se evita la inyección SQL).
6. **Respuesta**: `201 { cancion }`. Si se tiró un `HttpError`, el `errorHandler` responde `{ error }` con su código. Si fue un error inesperado, responde 500 con un mensaje genérico, y el detalle va solo al log.

### Cómo se garantiza que nadie ve las playlists de otro

- El id del usuario sale del **token**, nunca de lo que manda el cliente. Las pruebas mandan `id_usuario` de otro en el body, y se ignora.
- Toda query sobre `playlist` filtra por `id_playlist` **y** `id_usuario`.
- Las queries sobre `playlist_cancion` se hacen recién **después** de comprobar que la playlist es del usuario (`getOwn` / `lockOwn`).
- Si la playlist es de otro, la respuesta es **404**, igual que si no existiera (ver §7).

### Orden de las canciones

- Cada canción tiene `posicion`. Al agregar se usa `MAX(posicion) + 1`, así que va al final.
- **`FOR UPDATE`** bloquea la fila de la playlist hasta el `COMMIT`. Si llegan dos "agregar" a la vez, el segundo espera al primero y no pueden quedar los dos en la misma posición. Hay una prueba que manda dos pedidos simultáneos y comprueba que reciben las posiciones 4 y 5.
- Al quitar una canción, `closeGap` hace `posicion = posicion - 1` en las que estaban después, y quedan 1, 2, 3… sin huecos.
- La clave primaria `(id_playlist, deezer_id)` impide que la misma canción esté dos veces, aunque lleguen dos pedidos iguales juntos: uno da 201 y el otro 409.

### Actividad

| Acción | `tipo` | `deezer_id` | `id_playlist` | `detalle` |
|---|---|---|---|---|
| Crear | `creo_playlist` | — | sí | el nombre |
| Editar | `edito_playlist` | — | sí | `"viejo -> nuevo"` si cambió el nombre; si no, el nombre |
| Borrar | `borro_playlist` | — | `null` (ya no existe) | el nombre |
| Agregar canción | `agrego_a_playlist` | sí | sí | el nombre de la playlist |
| Quitar canción | `quito_de_playlist` | sí | sí | el nombre de la playlist |

- Se guarda el **nombre** en `detalle` porque, al borrar la playlist, `id_playlist` queda en `NULL` por `ON DELETE SET NULL`, y así igual se sabe cuál era.
- Si una edición no cambia nada, no se registra actividad. Tampoco se registra nada cuando la respuesta es un error (400, 404 o 409).

### Transacciones (`withTransaction`)

Se usan cada vez que se escribe en más de una tabla:

- crear: `playlist` + `actividad`;
- editar: `playlist` + `actividad`;
- borrar: `playlist` (y por cascada `playlist_cancion`) + `actividad`;
- agregar: `cancion` (caché) + `playlist_cancion` + `actividad`;
- quitar: `playlist_cancion` (borrar y reacomodar) + `actividad`.

Hay una prueba que fuerza un error en el medio y comprueba que no quedó nada guardado.

---

## 6. Cómo funciona el frontend

### Pantallas y componentes

```
App.js (MainApp: pestañas con useState + switch)
├── case 'biblioteca':
│   ├── playlistAbierta === null → LibraryScreen
│   │     ├── Chips: Canciones / Playlists / Mis reseñas   (la sección la guarda App.js)
│   │     └── PlaylistsTab                                 (sección 'playlists')
│   │           ├── CrearCard  → BottomSheet + PlaylistForm (crear)
│   │           ├── FlatList de PlaylistRow (PlaylistCover + nombre + tacho)
│   │           └── ConfirmSheet (borrar)
│   └── playlistAbierta = id → PlaylistDetailScreen
│         ├── Cabecera: volver, PlaylistCover grande, nombre, descripción, meta, ✎ 🗑 "+ Agregar"
│         ├── FlatList de PlaylistSongRow (posición, portada o iniciales, título, artista, m:ss, ⊖)
│         ├── BottomSheet + PlaylistForm (editar)
│         └── ConfirmSheet × 2 (borrar playlist / quitar canción)
└── case 'buscar': SearchScreen
      ├── resultado = SongItem + botón "+"
      └── AddToPlaylistSheet (lista de playlists, "Nueva playlist" → PlaylistForm, avisos)
```

### Navegación

- *Biblioteca → Playlists → tocar una playlist*: `onOpenPlaylist(id)` guarda el id en `playlistAbierta` (App.js), y se muestra el detalle.
- *← volver*: `playlistAbierta = null` y se vuelve a ver la biblioteca en la pestaña Playlists. Como `PlaylistsTab` se monta de nuevo, **vuelve a pedir la lista**, con las cantidades actualizadas.
- *"+ Agregar"*: `onNavigate('buscar')` cambia a la pestaña Buscar. Allí, el "+" de un resultado abre el panel para elegir la playlist. Al tocar *Biblioteca* en la barra de abajo, se vuelve al **mismo detalle**, que se pide de nuevo y ya muestra las canciones agregadas.
- **Por qué esos estados viven en `App.js`:** el `switch` desmonta la pantalla al cambiar de pestaña. Si `playlistAbierta` estuviera dentro de `LibraryScreen`, se perdería al ir a Buscar.

### Recorrido pantalla → servicio → backend → pantalla (ejemplo: quitar una canción)

1. En el detalle, el usuario toca ⊖. `pedirQuitar(cancion)` guarda la canción y se abre `ConfirmSheet`.
2. Toca *Quitar*. `ejecutar(...)` pone `enviando = true` (los botones quedan deshabilitados y aparece un spinner) y llama a `playlistsApi.removeSong(idPlaylist, deezerId)`.
3. `api/playlists.js` llama a `apiDelete('/playlists/7/songs/3135556')` de `client.js`.
4. `client.js` arma la URL con `EXPO_PUBLIC_API_URL`, agrega el token y hace el `fetch`.
5. El backend responde 204. Se cierra la confirmación y se llama a `cargar()`, que hace `GET /playlists/7`. La pantalla muestra **lo que devolvió el backend**, ya con las posiciones reacomodadas.

### Carga, errores, vacío y token vencido

| Caso | Qué se ve |
|---|---|
| Primera carga | Spinner grande en el centro (`Cargando`). |
| Recarga con datos en pantalla | Los datos siguen visibles y aparece un spinner chico (en el detalle, arriba a la derecha). En la lista también se puede deslizar hacia abajo para refrescar. |
| Mientras se envía algo | Botones deshabilitados y spinner en el botón. Es imposible mandar dos veces. En "Agregar a playlist" se deshabilitan todas las filas mientras se agrega. |
| Error de conexión | "No se pudo conectar con el servidor" + **Reintentar**. |
| Error en una acción | Aviso rojo dentro del panel (formulario, confirmación o "Agregar a playlist"). |
| 409 al crear o editar | El mensaje aparece **debajo del campo nombre**, en rojo. |
| 409 al agregar canción | Aviso rojo: "Ya estaba en “Nombre”". |
| 404 en el detalle | "Playlist no encontrada" + botón **Volver a mis playlists**. |
| Sin playlists | "Todavía no tenés playlists" + **Crear mi primera playlist**. |
| Playlist sin canciones | "Esta playlist está vacía" + **Buscar canciones**. |
| Token vencido (401) | Lo maneja `client.js`: llama a `signOut` del AuthContext y la app vuelve al login. Las pantallas de playlists no hacen nada extra. |

Además, `AbortController` cancela el pedido anterior si llega uno nuevo o si se sale de la pantalla. Así una respuesta vieja no pisa a una nueva.

### AuthContext y almacenamiento local

- De `useAuth()` se usa **solo `usuario.username`**, para el texto "de usuario". El token lo maneja `client.js`, que lo recibe del AuthContext; las pantallas de playlists no lo tocan.
- **Las playlists no se guardan en AsyncStorage ni en localStorage.** Lo pide la consigna, y además el backend es la única fuente de verdad: una copia local podría quedar vieja (por ejemplo, si cambiás algo desde otro dispositivo). Por eso cada pantalla pide los datos al entrar y después de cada cambio.
- Tampoco se usa un Context para las playlists, porque cada pantalla pide lo que necesita.

### Dónde conectarlo con la rama de Toto (detalle de canción)

1. **Tocar una canción del detalle de playlist → detalle de canción.** En el `App.js` de Toto (el que tiene `detalle` y `abrirCancion`), pasarle `onOpenSong={abrirCancion}` a `PlaylistDetailScreen`. La canción ya se convierte al formato del buscador con `aFormatoBuscador`. Para que el detalle de playlist se actualice al cerrar el de canción, se puede sumar un contador a la `key` (`key={`${playlistAbierta}-${contador}`}`) y subirlo en `cerrarDetalle`, como hace la biblioteca con `refreshKey`.
2. **"Agregar a playlist" en el detalle de canción.** En `SongDetailScreen`:
   ```js
   const [paraAgregar, setParaAgregar] = useState(null);
   // en el menú "...":
   <MenuItem icon="add-circle-outline" label="Agregar a playlist" onPress={() => { setMenuOpen(false); setParaAgregar(song); }} />
   // al final del return:
   <AddToPlaylistSheet cancion={paraAgregar} onClose={() => setParaAgregar(null)} />
   ```
   `song` ya viene en el formato que espera el panel (`deezerId`, `titulo`, `artista.nombre`, `album.portadaUrl`).
3. **Conflictos esperados al mergear:**
   - `App.js`, con las ramas de Toto y de Martín. Hay que juntar los dos cambios a mano.
   - `SearchScreen.js`, en la línea del `renderItem`: Toto le agrega `onPress={onOpenSong}` al `SongItem`; acá se envolvió el `SongItem` con el botón "+". Hay que quedarse con los dos.

---

## 7. Decisiones y alternativas descartadas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **404** si la playlist es de otro usuario | 403 | Las playlists son privadas. Con 403 le diríamos "esa playlist existe, pero no es tuya", que ya es información. Con 404 no se sabe si existe. La biblioteca hace lo mismo. (Las reseñas usan 403 porque son públicas: todos saben que existen.) |
| **fetch** (`client.js`) y no Axios en el front | Instalar Axios | El repo ya tenía `client.js`: agrega el token, convierte los errores, maneja el 401 y acepta `signal`. Cambiarlo afectaba a todas las pantallas y a las ramas de los demás, y la indicación fue no instalar Axios. El backend **sí** usa Axios para hablar con Deezer. Queda anotado en §10. |
| **Mosaico de colores** calculado con el id | Pedir las portadas de las primeras canciones (un pedido extra por playlist) o guardar el mosaico en la BD | No hace pedidos extra, sale siempre igual para la misma playlist y no inventa datos en la base. Si la imagen de `portada_url` no carga, también se muestra el mosaico. |
| 7 colores (número primo) y "empezar en id % 7, saltar de a 1…6" | Colores al azar | Al azar cambiaría en cada render. Con 7 colores y un salto de 1 a 6, los 4 colores del mosaico nunca se repiten. |
| Volver a pedir los datos después de cada cambio | Cambiar el estado local sin esperar al backend | La consigna pide que nada exista solo en la interfaz. Además, las posiciones las reacomoda el backend. |
| Validar en el formulario **y** en el backend | Solo en el backend | En el front es por comodidad (el error aparece al instante). En el back es por seguridad (el front se puede saltear). |
| PATCH solo con los campos que cambiaron | Mandar siempre los 3 | Es lo que significa PATCH. Si no cambió nada, ni se manda el pedido. |
| `null` para borrar descripción o portada | `""` | Es lo que pide el contrato (`""` también funciona: el backend lo convierte en `null`). |
| `ConfirmSheet` (Modal propio) | `Alert.alert` | `Alert` con botones no funciona en web. |
| "Nueva playlist" dentro del mismo panel de "Agregar a playlist" | Abrir otro Modal encima | En iOS, dos `Modal` a la vez suelen fallar. |
| Estado `playlistAbierta` y sección en `App.js` | Dentro de `LibraryScreen` | `LibraryScreen` se desmonta al cambiar de pestaña. Efecto secundario: ahora la biblioteca **recuerda la sección** (Canciones o Playlists) al ir y volver de otra pestaña. |
| `activityRepository.create` con `idPlaylist = null` opcional | Una función nueva | Las llamadas que ya existían siguen igual. |
| No tocar `GET /activity` | Agregar `id_playlist` a la respuesta, como en `Feli-Plat` | Era cambiar otra funcionalidad. Las pruebas leen `id_playlist` directo de la tabla. |
| `getSongData` antes de abrir la transacción | Dentro de la transacción | No dejar la transacción (y el bloqueo) abierta mientras se espera a Deezer. |
| `hasSong` antes de Deezer, y la PK como red de seguridad | Solo la PK | Evita llamar a Deezer si ya sabemos que va a dar 409. |
| No tocar `SongItem` (el "+" va al lado) | Agregarle una prop | La rama de Toto también modifica `SongItem`, y así hay menos conflictos. |
| La migración renombra los nombres repetidos | Dejar que falle | Igual que la 01: primero se arreglan los datos y después se agrega la regla. |
| El seed usa canciones que ya están en la biblioteca demo | Ids nuevos de Deezer | No hace pedidos nuevos a Deezer y el seed es reproducible. |

---

## 8. Diseño: qué salió del prototipo y qué se inventó

**Del prototipo, captura "08 · Playlists":**

- Avatar dorado con iniciales, "Tu biblioteca" y chips Canciones / **Playlists** / Mis reseñas (la activa en blanco). Ya existían.
- Card **"Crear playlist"** con borde dorado, cuadrado dorado con "+" y el subtítulo "Ponele nombre y sumale canciones".
- Filas con mosaico 2x2, nombre en negrita, "Playlist · de usuario · N canciones" e ícono de tacho.

**Del prototipo, captura "09 · Detalle de playlist":**

- Botón volver redondo arriba a la izquierda, portada grande centrada y nombre grande alineado a la izquierda.
- "de usuario · N canciones · X min".
- Botones redondos de lápiz y tacho, y la píldora oscura "+ Agregar".
- Lista numerada con portada (o cuadrado de color con iniciales, como "RA" o "AH"), título, artista e ícono ⊖.
- Los colores del mosaico: azul, dorado, violeta y naranja (detalle), y verde agua, crema y azul noche (lista).

**Cambios respecto del prototipo:**

- La cabecera del detalle es **azul liso** (`#1C3470`, el mismo del detalle de canción de Toto) y no un degradé, porque el degradé necesita `expo-linear-gradient` y no se podían instalar dependencias.
- **No están** el botón dorado de play ni la barra del reproductor (fuera de alcance), y no se dejó espacio para ellos.
- Se agregaron la **duración m:ss** en cada fila y la **descripción** debajo del nombre (los pedía la consigna).
- El "+" del encabezado de "Tu biblioteca" no está en la captura, pero ya existía (lleva a Buscar) y no se tocó.

**Inventado, con el mismo estilo de la app:**

- Formulario "Nueva playlist" / "Editar playlist", con contadores (x/100, x/300) y errores debajo de cada campo.
- Confirmaciones "¿Borrar la playlist?" y "¿Quitar de la playlist?" (copiadas de la de la biblioteca).
- Estados: "Todavía no tenés playlists", "Esta playlist está vacía", "Playlist no encontrada", error con Reintentar y carga.
- Panel "Agregar a playlist": cabecera con la canción, fila "Nueva playlist", lista con "+", avisos verde y rojo y botón "Listo".
- Botón "+" en cada resultado de Buscar.

---

## 9. Resultados de las pruebas

### Backend

| Prueba | Resultado |
|---|---|
| Migración 03, corrida 2 veces seguidas sobre `skmusic_db` | Sin errores. Quedaron la columna, el índice y el CHECK con 11 tipos. |
| `npm run test:playlists` | **113 OK, 0 fallas** (corrida 2 veces). |
| `npm run test:biblioteca` (para comprobar que no se rompió nada) | **94 OK, 0 fallas**. |

`test:playlists` prueba:

- sin token, token inventado, sin "Bearer", token de otro secreto y token vencido → 401 en las 7 rutas;
- crear con espacios de más, vacío, sin body, nombre de 101, descripción de 301, portada inválida, `ftp:`, `javascript:` y portada de 501 → 400; JSON mal formado → 400;
- nombre repetido con otras mayúsculas → 409; otro usuario con el mismo nombre → 201; renombrar cambiando solo las mayúsculas de la propia → 200;
- canción duplicada → 409 (también con dos pedidos simultáneos); canción que no existe en Deezer → 404;
- orden 1..N, reacomodo al quitar, la canción vuelta a agregar va al final, dos agregados simultáneos reciben posiciones distintas;
- PATCH parcial, `null` borra la descripción o la portada, una edición sin cambios no registra actividad;
- el usuario B no puede ver, editar, agregar, quitar ni borrar nada de A (404) y no ve sus playlists en la lista;
- la cascada al borrar, la actividad de los 5 tipos con sus detalles y el `ROLLBACK` de una transacción.

### Frontend y flujo de la app

| Prueba | Resultado |
|---|---|
| `npx expo export --platform web` (la salida fue a una carpeta temporal, fuera del repo) | **Compila sin errores.** |
| Íconos de Ionicons usados | Los 11 existen. |
| Recorrido del flujo contra el backend corriendo | **28 OK, 0 fallas** (ver abajo). |

**Cómo se probó el flujo.** No había un navegador disponible para tocar la app, así que se escribió un script temporal (fuera del repo). Hace **los mismos pedidos y en el mismo orden** que cada pantalla, y trata los errores igual que `client.js`. Como `DEMO_PASSWORD` estaba vacío, se usó un **usuario temporal**, que se borró al final. Se le armaron las mismas 3 playlists que crea el seed (mismas canciones, el renombre, la canción quitada, la portada de la primera canción y la playlist temporal que se borra).

Resultados:

- quedaron 3 playlists en el orden del prototipo, "Para estudiar" con imagen y las otras con mosaico, y actividad de los 5 tipos;
- detalle con "4 canciones · 22 min", posiciones 1..N y 404 para una inexistente;
- crear, 409 con otras mayúsculas y 400 si se saltea la validación del front;
- buscar "soda stereo", agregar el primer resultado, 409 al repetirlo y la cantidad actualizada en el panel;
- "Nueva playlist" desde el panel: se crea y se agrega la canción;
- editar nombre y descripción, borrar la descripción (`null`), poner y sacar la portada, y 409 al renombrar como otra;
- quitar una canción: las posiciones se reacomodan;
- **volver a loguearse: los cambios siguen ahí**;
- borrar: después, 404 "Playlist no encontrada";
- token vencido → 401; backend apagado → "No se pudo conectar con el servidor".

Al final, la base quedó como estaba: solo el usuario `lucas`, 0 playlists y 0 actividad. La caché de canciones creció de 12 a 18, que es normal.

### No se pudo hacer

- **Correr el seed** (`npm run seed:demo`), porque `DEMO_PASSWORD` está vacío en el `.env`. El código está listo: sus pasos se probaron con el usuario temporal y la consulta SQL de resumen que se le agregó se ejecutó aparte contra la base (solo lectura) sin errores. Para correrlo: poné una contraseña de 8 o más caracteres en `DEMO_PASSWORD` y corré `npm run seed:demo` en `Sk-Backend`. Debería mostrar 3 playlists ("Clásicos que no fallan" 4, "Rock nacional para manejar" 4, "Para estudiar" 4) y `actividad_playlists: agrego_a_playlist, borro_playlist, creo_playlist, edito_playlist, quito_de_playlist`.
- **Tocar la app con el mouse o el dedo.** Queda en la lista de abajo.

### Pruebas manuales pendientes (con `npm run dev` y la cuenta demo, en web y en el celular)

1. **Biblioteca → Playlists**: aparece el spinner y después la card dorada "Crear playlist" y las 3 playlists con su mosaico o imagen, más "Playlist · de demo · N canciones".
2. **Crear playlist** con solo el nombre: se cierra el panel y la nueva aparece **primera**, con mosaico y "0 canciones".
3. **Crear con un nombre repetido** ("para estudiar", en minúscula): aparece debajo del nombre, en rojo, "Ya tenés una playlist con ese nombre".
4. **Crear con una URL de portada inválida** ("hola"): aparece el error debajo de ese campo y **no se manda el pedido**.
5. **Crear con una URL de imagen válida**: se ve la imagen. Con una URL que no es imagen: se ve el mosaico.
6. **Abrir una playlist**: cabecera azul, portada, nombre, descripción, "de demo · 4 canciones · X min" y lista numerada con m:ss.
7. **✎ Editar**: cambiar el nombre y borrar la descripción (dejar el campo vacío). Al guardar, la cabecera se actualiza y la descripción desaparece.
8. **"+ Agregar"**: lleva a Buscar. Buscar una canción, tocar "+", elegir la playlist y ver "Se agregó a …". Tocar la **misma** playlist otra vez: "Ya estaba en …".
9. **"Nueva playlist" desde el panel**: completar el nombre y tocar "Crear y agregar". Debe aparecer en la lista del panel con 1 canción.
10. Desde Buscar, tocar **Biblioteca** en la barra de abajo: tiene que volver al **mismo detalle**, con la canción nueva al final.
11. **⊖ Quitar** una canción del medio → Cancelar (no pasa nada) → Quitar: desaparece y los números quedan 1, 2, 3… sin saltos.
12. **← Volver**: la lista muestra la cantidad de canciones **actualizada**.
13. **🗑 Borrar** desde la lista (Cancelar y después Borrar) y desde el detalle (vuelve a la lista).
14. **Usuario nuevo sin playlists**: "Todavía no tenés playlists" + "Crear mi primera playlist". Playlist sin canciones: "Esta playlist está vacía" + "Buscar canciones".
15. **Cerrar sesión** (Perfil), volver a entrar y comprobar que todo sigue como estaba.
16. **Backend apagado**: entrar a Playlists → error + Reintentar. Prenderlo y tocar Reintentar. Con el backend apagado, intentar crear: aviso rojo dentro del formulario.
17. **Token vencido** (por ejemplo, cambiar `JWT_SECRET` y reiniciar el backend): al entrar a Playlists, vuelve al login.
18. **Doble toque**: tocar "Crear" o "Borrar" dos veces rápido. Tiene que hacerse una sola vez (el botón queda deshabilitado con spinner).
19. **Web angosta y ancha**: los paneles no pasan de 560 px. En el celular (iOS), el teclado no tapa el formulario.

---

## 10. Cosas raras encontradas (no se cambiaron)

1. **La consigna pide Axios en el frontend, pero el repo usa `fetch`** (`src/api/client.js`). El backend sí usa Axios para Deezer. Conviene que el grupo decida si se cambia el interior de `client.js` (las pantallas no se enterarían) o si se explica en la defensa.
2. **Nombre de la base:** `Sk-Backend/.env.example` dice `DB_NAME=skmusic_db_v2`, pero en tu PostgreSQL la base se llama `skmusic_db`. Se cambió solo tu `.env` local.
3. **`DEMO_PASSWORD` vacío** en tu `.env`: sin esa contraseña no se puede correr el seed ni entrar con la cuenta `demo`.
4. **`Sk-Backend/.env.example` tiene valores que parecen reales**: un `JWT_SECRET` largo y `DB_PASSWORD=root`. Un `.env.example` debería tener las claves vacías. Si ese secreto se usa en algún lado, conviene cambiarlo.
5. **`skmusic_db_v2.sql` no tiene `portada_url` ni el índice único**: hay que correr las migraciones 01 y 03 después de crearla. (El SQL base no se tocó, igual que con la 01.)
6. **Hay dos cuentas de prueba distintas:** `skmusic_seed_demo.sql` crea "lucas" (su contraseña figura en un comentario del archivo) y `seed-demo.js` crea "demo". La consigna pide **una** cuenta demo con 3 playlists. "lucas" (el nombre del prototipo) no tiene playlists. Conviene elegir una.
7. **`GET /api/activity` no devuelve `id_playlist`** (la rama `Feli-Plat` sí lo agregaba). No se tocó, para no cambiar otra funcionalidad.
8. **La migración de `Feli-Plat` nunca se commiteó**, y su script de pruebas pedía una "migración 02" que no existía en el repo.
9. **El `package.json` de la raíz** usa `scripts/dev.js` y **el `README.md`** no está en esta rama: los dos se borraron en el commit "Biblioteca" de `Augusto2` (en `main` siguen). No se tocaron.
10. **`AGENTS.md` dice que se use Expo Router**, pero el proyecto no lo usa.
11. **`aFormatoBuscador` quedó en dos lugares**: en `LibraryScreen` (como estaba) y en `formato.js`. Se podría dejar solo la de `formato.js`, pero eso era tocar la pestaña Canciones.
12. **`SongItem` y `SearchScreen` usan colores sueltos** (`'#fff'`, `'#888'`…) en vez de `theme.js`. Ya estaba así.

---

## 11. Preguntas probables de la defensa

**¿Dónde se controla que una playlist sea del usuario?**
En el servidor. El id del usuario sale del token (`req.user.id`), y todas las queries de `playlist` filtran por `id_playlist` **y** `id_usuario`. Lo que mande el cliente en el body se ignora.

**¿Por qué 404 y no 403 si la playlist es de otro?**
Porque las playlists son privadas. Un 403 confirmaría que la playlist existe. Con 404 no se revela nada.

**¿Cómo evitan nombres repetidos? ¿Y si escribo "ROCK" en vez de "Rock"?**
Con un índice único en la base sobre `(id_usuario, LOWER(nombre))`. `LOWER` pasa todo a minúsculas, así que "ROCK" y "Rock" chocan. El backend responde 409 y el formulario lo muestra debajo del nombre. Otro usuario sí puede tener "Rock".

**¿Cómo se ordenan las canciones?**
Cada una tiene `posicion`. Al agregar se usa la última más 1. Al quitar, las de abajo suben un lugar. Así siempre queda 1, 2, 3…

**¿Qué pasa si agrego dos canciones al mismo tiempo?**
La playlist se bloquea con `FOR UPDATE` dentro de la transacción. El segundo pedido espera a que termine el primero, así que no pueden recibir la misma posición. Hay una prueba de eso.

**¿Para qué sirve la transacción?**
Agregar una canción escribe en 3 tablas (caché, `playlist_cancion` y `actividad`). Con la transacción se guardan las 3 o ninguna: nunca queda una canción agregada sin su actividad.

**¿Por qué se consulta Deezer antes de abrir la transacción?**
Porque Deezer puede tardar. Si la transacción estuviera abierta, la playlist quedaría bloqueada todo ese tiempo.

**¿La canción tiene que estar en la biblioteca para agregarla a una playlist?**
No. Si no está en la caché, se trae de Deezer con `getSongData` (la misma función que usa la biblioteca).

**¿Qué es la migración 03 y por qué no modificaron el SQL original?**
Es un script que cambia una base que **ya existe** sin perder datos: agrega la columna `portada_url`, el índice único y 2 tipos de actividad. Se puede correr dos veces sin error.

**¿Dónde están las llamadas HTTP del front?**
En `src/api/playlists.js`, una función por endpoint. Las pantallas nunca usan `fetch` directo: usan esas funciones, que pasan por `client.js` (agrega el token, convierte los errores y maneja el 401).

**¿Por qué fetch y no Axios?**
Porque el proyecto ya tenía su cliente con `fetch` y todas las pantallas lo usan. Hace lo mismo que haría Axios: URL base, token, errores con código y cancelación con `signal`.

**¿Qué pasa si se vence el token?**
El backend responde 401, `client.js` llama al `signOut` del AuthContext y la app vuelve al login. Vale para todas las pantallas.

**¿Guardan las playlists en el teléfono?**
No. Todo sale del backend: se pide al entrar a cada pantalla y después de cada cambio. Lo único guardado en el teléfono es el token de sesión, y eso ya lo hacía el AuthContext.

**¿Para qué usan el AuthContext acá?**
Solo para mostrar "de usuario" (`usuario.username`). No hay un Context de playlists, porque cada pantalla pide lo que necesita.

**¿Cómo se arma el mosaico de colores?**
Con el id de la playlist, sin pedir nada al backend. Hay 7 colores y el id decide desde cuál se empieza y de a cuántos se salta. Como 7 es primo, los 4 colores nunca se repiten, y la misma playlist siempre tiene el mismo mosaico.

**¿Dónde usan `map`, `filter` y `reduce`?**
- `reduce`: la duración total del detalle, sumando `duracion_seg`.
- `map`: las listas de playlists del panel y los 4 cuadrados del mosaico.
- `filter`: en el formulario, para mandar solo los campos que cambiaron (PATCH), y para armar el texto "de usuario · N canciones · X min".

**¿Cómo evitan que se envíe dos veces?**
Mientras se espera la respuesta, `enviando` está en `true`: el botón queda deshabilitado y con spinner. En las confirmaciones, además, tocar el fondo no cierra el panel.

**¿Qué pasa si la playlist se borró desde otro lado y la quiero abrir?**
El backend responde 404 y la pantalla muestra "Playlist no encontrada" con un botón para volver.

**¿Es responsive?**
Sí. Las listas ocupan todo el ancho y los textos largos se cortan con "…". En web, los paneles de abajo tienen un ancho máximo de 560 px. En iOS el panel sube con el teclado.
