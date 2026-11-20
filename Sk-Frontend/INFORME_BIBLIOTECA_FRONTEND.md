# Informe: Biblioteca (frontend)

Rama: `Augusto2` (sale de `main`, commit `57dd395` "JWT+Login"). No se hizo ningún commit.

---

## 1. Resumen

Se reemplazó la pantalla "Próximamente" de la pestaña **Biblioteca** por una pantalla real: **Tu biblioteca**.

En la pestaña **Canciones** el usuario puede:

- ver todas las canciones de su biblioteca (salen del backend);
- filtrar por estado: Todas, Quiero escuchar, Escuchando, Escuchado;
- filtrar por puntuación mínima (3★, 4★ o 5★) y ordenar (recientes, más viejas, mejor puntuadas);
- abrir un menú por canción para **cambiar el estado**, **puntuar de 1 a 5** y **quitarla** (con confirmación).

Las pestañas **Playlists** y **Mis reseñas** muestran "Próximamente", porque el backend todavía no tiene endpoints para eso.

Todo lo que cambia se guarda en el backend, así que sigue ahí aunque se cierre sesión.

**Lo que NO se hizo, a propósito.** El backend no lo soporta y el grupo decidió no tocarlo por ahora:
búsqueda por texto (`q`), conteos en los chips (`resumen`), orden por título o artista, favoritos (`me_gusta`), quitar la puntuación y "Mis reseñas".

---

## 2. Archivos creados y modificados

### Creados

| Archivo | Qué tiene |
|---|---|
| `src/api/library.js` | Funciones para hablar con `/api/library`: `getLibrary`, `removeFromLibrary`, `setEstado`, `setRating`. |
| `src/estados.js` | La lista de estados (`quiero_escuchar`, `escuchando`, `escuchado`) con su texto para mostrar. |
| `src/screens/LibraryScreen.js` | La pantalla. Tiene el encabezado, las pestañas internas y la lista de canciones con filtros. |
| `src/components/LibraryRow.js` | Una fila de la lista (portada, título, artista, estado, estrellas, botones ⋯ y ⊖). |
| `src/components/SongActionsSheet.js` | El menú que sube desde abajo: estado, puntuación, quitar y confirmación. |
| `src/components/BottomSheet.js` | Panel genérico que aparece desde abajo (lo usan el menú de acciones y el de "Ordenar y filtrar"). |
| `src/components/EstadoBadge.js` | La etiqueta de color con el estado. |
| `src/components/Stars.js` | 5 estrellas. Pueden ser solo para mostrar o tocables (para puntuar). |

### Modificados

| Archivo | Qué cambió |
|---|---|
| `App.js` | 2 líneas: se importa `LibraryScreen` y se usa en el `case 'biblioteca'` en vez de `PlaceholderScreen`. |
| `src/api/client.js` | Se agregaron `apiPut`, `apiPatch` y `apiDelete`. Son **exactamente las mismas líneas** que escribió Toto en su rama, así que al mergear git no marca conflicto en ese archivo. |
| `src/theme.js` | Un color nuevo: `overlay` (el fondo oscuro semitransparente detrás de los menús). |

---

## 3. Componentes y cómo se conectan con App.js

```
App.js (MainApp, switch de pestañas)
└── LibraryScreen            ← case 'biblioteca', recibe onNavigate={setTab}
    ├── Encabezado (avatar con iniciales, "Tu biblioteca", botón +)
    ├── Chip × 3              ← pestañas internas: Canciones / Playlists / Mis reseñas
    ├── Canciones             ← toda la lógica de la lista
    │   ├── Chip × 4          ← filtros de estado
    │   ├── Barra             ← "N canciones" + botón de orden
    │   ├── FlatList de LibraryRow
    │   ├── SongActionsSheet  ← menú de una canción (usa BottomSheet + Stars)
    │   └── BottomSheet       ← "Ordenar y filtrar"
    └── Proximamente          ← Playlists y Mis reseñas
```

**Props de `LibraryScreen`:**

- `onNavigate(tab)`: el botón **+** y el botón "Ir a Buscar" llaman a `onNavigate('buscar')`.
- `onOpenSong(song)` (opcional): si existe, tocar una canción abre su detalle. Si no existe (como en esta rama, donde todavía no hay detalle), tocarla abre el menú de acciones.
- `refreshKey` (opcional): cada vez que cambia este valor, la lista se vuelve a pedir.

### Qué hay que hacer cuando se mergee con la rama de Toto

En la rama de Toto el detalle de canción se dibuja **encima** de la pestaña, así que la biblioteca no se desmonta cuando se abre el detalle. Para que se actualice al cerrarlo, en `App.js` de Toto hay que:

```js
// 1) un contador que sube cada vez que se cierra el detalle
const [refrescarBiblioteca, setRefrescarBiblioteca] = useState(0);
const cerrarDetalle = useCallback(() => {
  setDetalle(null);
  setRefrescarBiblioteca((n) => n + 1);
}, []);

// 2) pasarle las dos props a la biblioteca
case 'biblioteca':
  return (
    <LibraryScreen
      onNavigate={cambiarTab}
      onOpenSong={abrirCancion}
      refreshKey={refrescarBiblioteca}
    />
  );
```

`LibraryScreen` convierte la canción al formato que espera el detalle (camelCase: `deezerId`, `artista.nombre`, `album.portadaUrl`...) con la función `aFormatoBuscador`.

**Conflicto esperado al mergear:** `src/api/library.js` lo creamos los dos. Git va a marcar conflicto y hay que quedarse con **las funciones de los dos**:

- de Toto: `getLibraryItem`, `addToLibrary`, `setLike`;
- de esta rama: `getLibrary`;
- `removeFromLibrary`, `setEstado` y `setRating` están en los dos lados con el mismo nombre y los mismos parámetros, así que hay que dejar una sola copia de cada una.

---

## 4. Cada acción y su endpoint

| Acción en la pantalla | Función (`src/api/library.js`) | Endpoint | Qué se hace con la respuesta |
|---|---|---|---|
| Entrar a la pestaña, cambiar filtro u orden, deslizar para refrescar | `getLibrary(filtros, { signal })` | `GET /api/library?estado=&puntuacion_min=&orden=&direccion=` | Se muestra `canciones`. |
| Tocar un estado en el menú | `setEstado(id, estado)` | `PATCH /api/library/:deezerId/status` | Se reemplaza la canción por la que devuelve el backend. Si hay un filtro de estado activo, se vuelve a pedir la lista. |
| Tocar una estrella en el menú | `setRating(id, n)` | `PUT /api/library/:deezerId/rating` | Igual. Si hay filtro de puntuación o el orden es por puntuación, se vuelve a pedir la lista. |
| ⊖ (o "Quitar" en el menú) y después "Quitar" | `removeFromLibrary(id)` | `DELETE /api/library/:deezerId` | Responde 204 sin cuerpo. Se saca la canción de la lista con `filter`. |

Todas van con el token: lo agrega `client.js` solo.

---

## 5. Filtros, orden y cancelación de pedidos

**Filtros y orden.** Hay tres estados en `Canciones`: `filtroEstado`, `puntuacionMin` y `ordenKey`. La función `cargar` está hecha con `useCallback` y depende de esos tres. Hay un `useEffect` que llama a `cargar()` cada vez que `cargar` cambia, o sea, cada vez que cambia un filtro. **El filtrado lo hace el backend**: el front solo manda los parámetros. Los que están en `null` no se mandan, porque `apiGet` los saltea.

**Opciones de orden** (las que acepta el backend):

| En pantalla | `orden` | `direccion` |
|---|---|---|
| Agregadas recientemente | `fecha` | `desc` |
| Agregadas primero | `fecha` | `asc` |
| Mejor puntuadas | `puntuacion` | `desc` |

**Búsqueda con debounce.** No se hizo, porque el backend no tiene el parámetro `q`. Si más adelante se agrega, el patrón ya está en `SearchScreen`: un `setTimeout` de 400 ms dentro de un `useEffect`, que se limpia con `clearTimeout` si el usuario sigue escribiendo.

**Cancelación con `signal`:**

1. `controllerRef` guarda el `AbortController` del pedido en curso.
2. Cada vez que se llama a `cargar`, primero se hace `abort()` del pedido anterior. Así, si el usuario toca tres chips rápido, solo vale la respuesta del último.
3. Al salir de la pantalla también se cancela, con el `useEffect` que devuelve `() => controllerRef.current?.abort()`.
4. Un pedido cancelado tira un error `AbortError`, que se ignora y no se muestra como error.
5. Solo el **último** pedido apaga el indicador de carga (`if (controllerRef.current === controller)`). Así un pedido viejo cancelado no apaga el spinner del nuevo.

---

## 6. Carga, errores, respuestas vacías y token vencido

- **Primera carga** (lista vacía): spinner grande en el centro.
- **Recarga con datos en pantalla** (cambiar filtro, después de una acción): la lista sigue visible y aparece un spinner chiquito al lado de "N canciones".
- **Deslizar hacia abajo:** `RefreshControl` (pull to refresh).
- **Error de conexión o del servidor:** ícono de nube tachada, el mensaje que manda el backend (o "No se pudo conectar con el servidor") y un botón **Reintentar**.
- **Biblioteca vacía (sin filtros):** "Tu biblioteca está vacía" y un botón **Ir a Buscar**.
- **Filtros sin resultados:** "No hay canciones con estos filtros" y un botón **Limpiar filtros** (vuelve a Todas y a "Cualquiera").
- **Mientras se envía una acción:** los botones del menú quedan deshabilitados (`disabled`, más transparentes), aparece un spinner arriba a la derecha del menú y el botón "Quitar" muestra un spinner.
- **Error en una acción:** se muestra dentro del menú, con el mismo estilo de error que el login. Si el error es 404 (la canción ya no estaba), además se vuelve a pedir la lista.
- **Token vencido (401):** lo maneja `client.js`, que llama a `signOut` del `AuthContext` y la app vuelve al login. La biblioteca no hace nada extra, para no duplicarlo.

---

## 7. Sincronización con el backend (por qué no se guarda nada local)

- La lista **siempre** se pide al backend al entrar a la pestaña. Como el `switch` de `App.js` desmonta la pantalla al cambiar de pestaña, al volver se pide de nuevo.
- Después de cada cambio se muestra **lo que devolvió el backend**, no lo que el front "cree" que pasó. Por ejemplo, después de puntuar se usa la canción que manda `PUT /rating`.
- Si el cambio puede afectar qué canciones entran en la lista o en qué orden, se vuelve a pedir la lista entera. Por ejemplo, si estás viendo "Escuchando" y pasás una canción a "Escuchado", tiene que desaparecer.
- **No se usa AsyncStorage, localStorage ni ningún almacenamiento local** para la biblioteca. La consigna lo pide así, y además el backend es la única fuente de verdad: si guardáramos una copia local, podría quedar desactualizada (otro dispositivo, otra sesión). El único dato guardado en el teléfono es el token de sesión, y eso ya lo hacía `AuthContext`.

---

## 8. Decisiones y alternativas descartadas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Menús con `Modal` propio (`BottomSheet`) | `Alert.alert` | `Alert` no funciona en web, y la app se publica en web. |
| La confirmación de "Quitar" va **dentro** del mismo panel | Un segundo `Modal` encima | En iOS, abrir un `Modal` mientras otro está abierto o cerrándose suele fallar. |
| Fila propia (`LibraryRow`) | Reutilizar `SongItem` | `SongItem` espera el formato del buscador (camelCase). La consigna pedía no cambiarlo. |
| Filtrar y ordenar en el **backend** | Hacerlo en el front con `filter`/`sort` | Decisión del grupo: no simular en el front lo que el backend no tiene. |
| Chips **sin** conteos | Contar en el front | Mismo motivo: no hay campo `resumen` en el backend. |
| `import * as libraryApi` | Importar `setEstado` suelto | `setEstado` parecería un setter de `useState`. Con `libraryApi.setEstado(...)` se ve claro que es un pedido HTTP. |
| `refreshKey` como prop | Desmontar y volver a montar la pantalla | Es el cambio más chico en `App.js` y no pierde los filtros elegidos. |
| Mismos nombres de funciones que Toto en `api/library.js` | Archivo con otro nombre | Al mergear queda un solo archivo, sin funciones repetidas con distinto nombre. |
| Función `iniciales` copiada de `HomeScreen` | Exportarla desde `HomeScreen` | Para no modificar la Home. Se podría mover a un archivo común más adelante. |
| Botón **⋯** en cada fila | Solo tocar la fila | Cuando exista el detalle, tocar la fila va a abrir el detalle, y el ⋯ sigue abriendo el menú rápido. |

---

## 9. Diseño: qué sale del prototipo y qué se inventó

**Del prototipo:**

- Encabezado con avatar dorado con iniciales, título "Tu biblioteca" y botón **+**.
- Pestañas tipo píldora: Canciones / Playlists / Mis reseñas, con la activa en blanco.
- Chips de filtro con el activo en dorado.
- Texto "N canciones" a la izquierda y "⇅ Agregadas recientemente" a la derecha.
- Filas con portada, título, artista, etiqueta de estado, estrellas y botón ⊖ para quitar.

**Cambios respecto del prototipo:**

- "Favorito" aparece como etiqueta en el prototipo, pero **no es un estado**, así que no está.
- El corazón no está: el backend de esta rama no tiene `me_gusta`.
- Los chips no tienen conteos (por ejemplo, "Todas · 12"), porque no hay `resumen`.
- El reproductor de abajo no se hizo (pedido explícito).
- Se agregó el botón ⋯ en cada fila.

**Inventado (no estaba en el prototipo):**

- El menú de acciones (estado con píldoras, 5 estrellas grandes, "Quitar de la biblioteca").
- La confirmación de quitar (ícono de tacho rojo, texto, botones Cancelar / Quitar).
- La hoja "Ordenar por" + "Puntuación mínima".
- Los estados vacío, sin resultados, error y carga.
- La pantalla "Próximamente" de Playlists y Mis reseñas.
- Los colores de las etiquetas: Quiero escuchar en gris azulado, Escuchando en dorado y Escuchado en verde (`colors.success`).

---

## 10. Pruebas

### Hechas

- `npx expo export --platform web` **compila sin errores**. La salida se mandó a una carpeta temporal, no al repo.
- Se verificó que todos los íconos usados existen en Ionicons.
- **No se probó contra el backend**, porque no estaba corriendo (`http://localhost:3000/api/health` no respondió). Tampoco se usaron datos falsos.

### Pendientes (para hacer a mano con el backend levantado y la cuenta demo)

1. Entrar a **Biblioteca**: aparece el spinner y después la lista con "N canciones".
2. Tocar cada chip de estado: la lista cambia y el chip queda dorado.
3. Tocar los chips rápido varias veces: al final se ve la lista del último chip, sin errores.
4. "Ordenar por": probar las 3 opciones y ver que cambia el orden.
5. "Puntuación mínima" 4★: solo aparecen las de 4 y 5, y el texto dice "· 4★ o más".
6. Filtro que no da resultados: aparece "No hay canciones con estos filtros". Tocar "Limpiar filtros".
7. ⋯ → cambiar el estado: la etiqueta de la fila cambia.
8. Con el filtro "Escuchando", pasar una canción a "Escuchado": desaparece de la lista.
9. ⋯ → tocar estrellas: cambian en el menú y en la fila.
10. ⊖ → Cancelar: no pasa nada. ⊖ → Quitar: desaparece y baja "N canciones".
11. Cerrar sesión, volver a entrar y ver que los cambios siguen ahí.
12. Apagar el backend y entrar a Biblioteca: aparece el error con "Reintentar". Prenderlo y tocar Reintentar.
13. Con el backend apagado, abrir el menú y cambiar el estado: aparece el error dentro del menú.
14. Token vencido (o cambiar `JWT_SECRET` y reiniciar el backend): al pedir la lista vuelve al login.
15. Biblioteca vacía (usuario nuevo): "Tu biblioteca está vacía" y "Ir a Buscar" lleva a Buscar.
16. Botón **+** → va a Buscar.
17. Pestañas Playlists y Mis reseñas: muestran "Próximamente".
18. Probar en web con la ventana angosta y ancha: el menú de abajo no pasa de 560 px de ancho.

---

## 11. Cosas raras encontradas (no se tocaron)

1. **La rama `Augusto-Perez-Rodriguez` estaba 4 commits atrás de `main`** y no tenía login ni JWT en el front. Se adelantó con `git merge --ff-only main` (con autorización). Después se creó `Augusto2` desde `main`.
2. **`client.js` de `main` solo tenía `apiGet` y `apiPost`**, aunque el pedido decía que tenía también PUT, PATCH y DELETE. Esos estaban solo en la rama de Toto.
3. **`api/library.js`, `api/reviews.js` y `SongDetailScreen` no existen en `main`**: están solo en la rama de Toto.
4. **Faltan en el backend:** `q`, `resumen`, orden por título o artista, `me_gusta` (solo en la rama de Toto), quitar la puntuación y listar "mis reseñas".
5. **`skmusic_db_v2.sql` todavía permite `'favorito'`** en el `CHECK` del estado. Si alguien crea la base sin correr la migración 01, la base lo acepta. La API igual lo rechaza.
6. **"Favorito" significa dos cosas distintas:** la Home dice "Puntuá canciones con 4 o 5 estrellas y van a aparecer acá" (favorito = buena puntuación), mientras que la rama de Toto agrega `me_gusta` (favorito = corazón). Conviene que el grupo elija uno.
7. **`AGENTS.md` dice que se use Expo Router**, pero el proyecto no lo usa.
8. **`SongItem` y `SearchScreen` usan colores sueltos** (`'#fff'`, `'#888'`, `'#2A3457'`, `'#000'`, `'#555'`) en vez de `theme.js`.
9. **Archivos borrados en la copia local (sin commitear):** `README.md` (ya estaba así antes de empezar), y durante esta sesión aparecieron borrados también `.expo/README.md`, `.expo/settings.json` y `scripts/dev.js`. No fue a propósito de esta tarea. Si no los borró nadie del grupo, se recuperan con `git restore <archivo>`.
10. **Backend, `withTransaction`:** si el `ROLLBACK` falla, ese error tapa al error original.

---

## 12. Preguntas probables de la defensa

**¿Dónde están las llamadas HTTP?**
En `src/api/library.js`. La pantalla nunca usa `fetch` directo: llama a `libraryApi.getLibrary(...)`, `libraryApi.setEstado(...)`, etc. Y esas funciones usan `client.js`, que agrega el token y convierte los errores.

**¿Por qué no se guarda la biblioteca en el teléfono?**
Porque el backend es la única fuente de verdad y la consigna lo pide. Si guardáramos una copia, podría quedar vieja. Cada vez que entrás a la pestaña se pide de nuevo.

**¿Cómo se actualiza la pantalla después de un cambio?**
Con lo que devuelve el backend: se reemplaza esa canción en la lista con `map`. Si el cambio la puede sacar de la lista por un filtro, se pide la lista de nuevo.

**¿Para qué sirve el `AbortController`?**
Para cancelar el pedido anterior si llega uno nuevo (por ejemplo, tocar chips rápido) o si salís de la pantalla. Así no se muestra una respuesta vieja encima de una nueva.

**¿Por qué `useCallback` en `cargar`?**
Para que la función solo cambie cuando cambian los filtros. El `useEffect` depende de `cargar`, así que se ejecuta justo cuando cambia un filtro, y no en cada render.

**¿Qué pasa si se vence el token?**
El backend responde 401. `client.js` llama a `onUnauthorized`, que es el `signOut` del `AuthContext`, y la app vuelve al login. Esto vale para todas las pantallas, no solo para la biblioteca.

**¿Usaron Context para la biblioteca?**
No, porque solo la usa esta pantalla. El único Context es el de la sesión (`AuthContext`), que sí lo necesitan varias partes de la app. Usamos `useAuth()` para mostrar las iniciales del usuario.

**¿Por qué un Modal y no `Alert` para confirmar?**
Porque `Alert` no funciona en la versión web, y la app se publica en web.

**¿Dónde usan `map`, `filter` y renderizado condicional?**
- `map` para dibujar los chips, las estrellas, las opciones de orden y para reemplazar la canción actualizada.
- `filter` para sacar la canción quitada.
- Renderizado condicional para spinner, error, vacío, "Próximamente", la etiqueta de estrellas y el modo del menú (acciones o confirmar).

**¿Cómo funcionan los filtros?**
Cada chip cambia un estado (`filtroEstado`). Eso cambia `cargar`, el `useEffect` la ejecuta y se manda `GET /api/library?estado=...`. El filtrado lo hace el backend con SQL.

**¿Es responsive?**
Sí. La lista ocupa todo el ancho y los chips se deslizan en horizontal si no entran. En web, el menú de abajo tiene un ancho máximo para que no se estire en pantallas grandes. Los textos largos se cortan con "…" (`numberOfLines={1}`).

**¿Por qué no hay buscador ni favoritos en la biblioteca?**
Porque el backend todavía no tiene esos endpoints, y el grupo decidió no simularlos en el front.
