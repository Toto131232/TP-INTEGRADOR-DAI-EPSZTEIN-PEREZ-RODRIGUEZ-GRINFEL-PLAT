"# TP-INTEGRADOR-DAI-EPSZTEIN-PEREZ-RODRIGUEZ-GRINFEL-PLAT" 
SKMusic es una app para escuchar música, puntuarla con estrellas y dejar reseñas. Con lo que cada usuario escucha y guarda, la app arma un resumen tipo Spotify Wrapped: sus artistas y canciones más escuchados, sus géneros favoritos y a qué hora escucha más.

Es nuestro TP final "My Collection" de EFSI & DAI 2026, con la temática música.

Por ahora tenemos la base de datos armada y el backend ya se conecta a la BD y a la API de Deezer. Todavía no hicimos ningún endpoint, así que esa parte la vamos a documentar más adelante.

Qué va a tener la app
Registro e inicio de sesión
Buscar canciones, artistas y álbumes
Escuchar el preview de 30 segundos de cada canción
Una biblioteca donde guardás canciones como "Quiero escuchar", "Escuchando", "Escuchado" o "Favorito"
Puntuar canciones de 1 a 5 estrellas y escribir reseñas públicas
Crear playlists
Estadísticas y el resumen estilo Wrapped
Con qué lo hicimos
Frontend: React Native con Expo
Backend: Node.js con Express
Base de datos: PostgreSQL, con consultas en SQL (sin ORM)
Login: JWT, y las contraseñas se guardan hasheadas con bcrypt
Música: la API de Deezer, a la que le pegamos con axios

La consigna no deja usar Supabase ni nada que nos resuelva el login, los endpoints o la base de datos. Todo eso lo hace nuestro backend.

Cómo funciona

La app nunca habla directamente con Deezer ni con la base de datos. Le pide todo a nuestro backend, y el backend se encarga del resto:

App (Expo)  →  Backend (Express)  →  Deezer
                      ↓
                 PostgreSQL

Deezer tiene todo el catálogo: canciones, artistas, álbumes, portadas y previews. Nuestra base de datos guarda lo que Deezer no sabe, que es lo de cada usuario: su biblioteca, sus puntuaciones, sus reseñas, sus playlists y lo que escuchó.

Dentro del backend separamos el código así:

routes/: los endpoints. Todos van en routes/index.js
controllers/: reciben el pedido y devuelven la respuesta
services/: la lógica y las consultas a la BD o a Deezer
middlewares/: la verificación del token, entre otras cosas
config/: la conexión a PostgreSQL y a Deezer
Cómo correrlo

Necesitás Node 18 o más nuevo, PostgreSQL y la app Expo Go en el celular.

1. Crear la base de datos

bash
createdb -U postgres skmusic
psql -U postgres -d skmusic -f backend/database/skmusic_db.sql

El script borra las tablas antes de crearlas, así que sirve para resetear la base. Cuidado, porque también borra los datos.

2. Levantar el backend

bash
cd backend
npm install
npm run dev

Antes hay que crear un archivo .env copiando .env.example y completando los datos de la base y el secreto del JWT. El .env no se sube al repo.

3. Levantar la app

bash
cd frontend
npm install
npx expo start

Escaneás el QR con Expo Go y listo. Si lo probás en el celular, en la URL del backend poné la IP de tu compu (por ejemplo http://192.168.0.15:3000) en vez de localhost. Los dos tienen que estar en el mismo Wi-Fi.

La base de datos

Como las canciones son de Deezer, no tenemos tablas de artistas, álbumes ni géneros. Lo que hacemos es guardar una copia chica de cada canción que algún usuario usó, y la identificamos con el mismo ID que tiene en Deezer (deezer_id). Todas las demás tablas se relacionan con eso.

Las tablas son:

usuario: los datos de la cuenta
preferencia_genero: los géneros que le gustan a cada usuario
cancion: la copia de las canciones de Deezer
biblioteca: las canciones que guardó cada usuario, con su estado y su puntuación
resena: las reseñas (una por usuario por canción)
playlist y playlist_cancion: las playlists y qué canciones tiene cada una
actividad: un registro de todo lo que hace el usuario
historial_reproduccion: cada vez que alguien escucha una canción. De acá salen la mayoría de las estadísticas

Una canción solo se guarda en la base cuando el usuario hace algo con ella, como guardarla, puntuarla o escucharla. Si solo la busca, no se guarda nada. Si se borra un usuario, se borra todo lo suyo.

Deezer

Usamos la API pública de Deezer (https://api.deezer.com). No pide clave ni login. La conexión está en config/deezer.js.

Algunas cosas que aprendimos usándola:

Cuando hay un error, Deezer igual responde con status 200, pero manda un campo error en la respuesta. Hay que fijarse en eso.
Tiene un límite de unos 50 pedidos cada 5 segundos, así que conviene usar lo que ya está guardado en la base.
Cada canción trae un link a un preview de 30 segundos que se puede reproducir desde la app.
Endpoints

Todavía no hay. Cuando los hagamos, van a ir en routes/index.js, todos van a empezar con /api y los que necesitan login van a pedir el token en el header Authorization: Bearer <token>.

