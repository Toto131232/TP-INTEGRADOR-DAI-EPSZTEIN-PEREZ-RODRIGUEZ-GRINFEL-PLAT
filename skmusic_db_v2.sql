-- =====================================================
--  SKMusic - Base de datos v2 (PostgreSQL)
--  Catálogo: Deezer API  |  Acá se guarda solo lo del usuario
-- =====================================================

DROP TABLE IF EXISTS historial_reproduccion, actividad, playlist_cancion, playlist,
                     resena, biblioteca, preferencia_genero, cancion, usuario CASCADE;

-- -----------------------------------------------------
--  USUARIO (auth + perfil)
-- -----------------------------------------------------
CREATE TABLE usuario (
    id_usuario     SERIAL PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,            -- bcrypt, nunca texto plano
    nombre         VARCHAR(100),
    avatar_url     TEXT,
    bio            VARCHAR(300),
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Géneros musicales que el usuario eligió como preferidos (perfil)
CREATE TABLE preferencia_genero (
    id_usuario  INT         NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    genero      VARCHAR(60) NOT NULL,
    PRIMARY KEY (id_usuario, genero)
);

-- -----------------------------------------------------
--  CANCION (caché de Deezer)
--  Se guarda lo mínimo para mostrar las vistas personales
--  sin volver a llamar a la API. El ID es el de Deezer.
-- -----------------------------------------------------
CREATE TABLE cancion (
    deezer_id          BIGINT PRIMARY KEY,
    titulo             VARCHAR(200) NOT NULL,
    artista_deezer_id  BIGINT,
    artista_nombre     VARCHAR(150) NOT NULL,
    album_titulo       VARCHAR(200),
    portada_url        TEXT,
    duracion_seg       INT CHECK (duracion_seg > 0),
    genero             VARCHAR(60),
    fecha_lanzamiento  DATE
);

-- -----------------------------------------------------
--  BIBLIOTECA (estado + puntuación de cada canción del usuario)
-- -----------------------------------------------------
CREATE TABLE biblioteca (
    id_usuario      INT    NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    deezer_id       BIGINT NOT NULL REFERENCES cancion(deezer_id)  ON DELETE CASCADE,
    estado          VARCHAR(20) NOT NULL DEFAULT 'quiero_escuchar'
                    CHECK (estado IN ('quiero_escuchar', 'escuchando', 'escuchado', 'favorito')),
    puntuacion      SMALLINT CHECK (puntuacion BETWEEN 1 AND 5),   -- NULL si no la puntuó
    agregada_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizada_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_usuario, deezer_id)
);

-- -----------------------------------------------------
--  RESEÑA (pública, una por usuario por canción)
-- -----------------------------------------------------
CREATE TABLE resena (
    id_resena   SERIAL PRIMARY KEY,
    id_usuario  INT    NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    deezer_id   BIGINT NOT NULL REFERENCES cancion(deezer_id)  ON DELETE CASCADE,
    texto       TEXT   NOT NULL CHECK (LENGTH(TRIM(texto)) > 0),
    creada_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    editada_en  TIMESTAMPTZ,
    UNIQUE (id_usuario, deezer_id)
);

-- -----------------------------------------------------
--  PLAYLIST (colecciones del usuario)
-- -----------------------------------------------------
CREATE TABLE playlist (
    id_playlist  SERIAL PRIMARY KEY,
    id_usuario   INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    nombre       VARCHAR(100) NOT NULL,
    descripcion  VARCHAR(300),
    creada_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE playlist_cancion (
    id_playlist  INT    NOT NULL REFERENCES playlist(id_playlist) ON DELETE CASCADE,
    deezer_id    BIGINT NOT NULL REFERENCES cancion(deezer_id)    ON DELETE CASCADE,
    posicion     INT    NOT NULL,
    agregada_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_playlist, deezer_id)
);

-- -----------------------------------------------------
--  ACTIVIDAD (registro de cada acción, pedido en 3.4)
-- -----------------------------------------------------
CREATE TABLE actividad (
    id_actividad  BIGSERIAL PRIMARY KEY,
    id_usuario    INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    tipo          VARCHAR(30) NOT NULL
                  CHECK (tipo IN ('agrego_cancion', 'quito_cancion', 'cambio_estado',
                                  'puntuo', 'reseno', 'edito_resena',
                                  'creo_playlist', 'borro_playlist', 'agrego_a_playlist')),
    deezer_id     BIGINT REFERENCES cancion(deezer_id)    ON DELETE SET NULL,
    id_playlist   INT    REFERENCES playlist(id_playlist) ON DELETE SET NULL,
    detalle       VARCHAR(200),          -- ej: 'escuchando -> escuchado' o '4 estrellas'
    creada_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
--  HISTORIAL DE REPRODUCCION (para el resumen tipo Wrapped)
--  Se llena cuando el usuario escucha un preview en la app
--  o importando un historial de Spotify / Last.fm
-- -----------------------------------------------------
CREATE TABLE historial_reproduccion (
    id_reproduccion      BIGSERIAL PRIMARY KEY,
    id_usuario           INT    NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    deezer_id            BIGINT NOT NULL REFERENCES cancion(deezer_id)  ON DELETE CASCADE,
    reproducida_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- fecha y hora
    segundos_escuchados  INT NOT NULL CHECK (segundos_escuchados >= 0)
);

-- -----------------------------------------------------
--  ÍNDICES (las consultas siempre filtran por usuario)
-- -----------------------------------------------------
CREATE INDEX idx_biblioteca_estado    ON biblioteca (id_usuario, estado);
CREATE INDEX idx_actividad_usuario    ON actividad (id_usuario, creada_en DESC);
CREATE INDEX idx_historial_usuario    ON historial_reproduccion (id_usuario, reproducida_en);
CREATE INDEX idx_resena_cancion       ON resena (deezer_id);

-- =====================================================
--  EJEMPLOS DE ESTADÍSTICAS (reemplazar :id por el usuario logueado)
-- =====================================================
-- 1) Canciones por estado
-- SELECT estado, COUNT(*) FROM biblioteca WHERE id_usuario = :id GROUP BY estado;
--
-- 2) Puntuación promedio
-- SELECT ROUND(AVG(puntuacion), 2) FROM biblioteca WHERE id_usuario = :id AND puntuacion IS NOT NULL;
--
-- 3) Top 5 artistas de su biblioteca
-- SELECT c.artista_nombre, COUNT(*) AS cantidad
-- FROM biblioteca b JOIN cancion c ON c.deezer_id = b.deezer_id
-- WHERE b.id_usuario = :id GROUP BY c.artista_nombre ORDER BY cantidad DESC LIMIT 5;
--
-- 4) Géneros que predominan
-- SELECT c.genero, COUNT(*) AS cantidad
-- FROM biblioteca b JOIN cancion c ON c.deezer_id = b.deezer_id
-- WHERE b.id_usuario = :id AND c.genero IS NOT NULL GROUP BY c.genero ORDER BY cantidad DESC;
--
-- 5) Minutos escuchados por mes en el año actual (Wrapped)
-- SELECT EXTRACT(MONTH FROM reproducida_en) AS mes, SUM(segundos_escuchados) / 60 AS minutos
-- FROM historial_reproduccion
-- WHERE id_usuario = :id AND EXTRACT(YEAR FROM reproducida_en) = EXTRACT(YEAR FROM NOW())
-- GROUP BY mes ORDER BY mes;
--
-- 6) Franja horaria en la que más escucha (hábitos)
-- SELECT EXTRACT(HOUR FROM reproducida_en) AS hora, COUNT(*) AS reproducciones
-- FROM historial_reproduccion WHERE id_usuario = :id
-- GROUP BY hora ORDER BY reproducciones DESC LIMIT 1;
