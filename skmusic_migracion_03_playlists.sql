-- =====================================================
--  SKMusic - Migración 03 (PostgreSQL)
--  Playlists: portada, nombres sin repetir y dos tipos de actividad nuevos.
--  Correr una sola vez sobre una base creada con skmusic_db_v2.sql
--  (se puede volver a correr sin problema)
-- =====================================================

BEGIN;

-- -----------------------------------------------------
--  PLAYLIST: portada opcional (la API solo acepta URLs http o https)
-- -----------------------------------------------------
ALTER TABLE playlist ADD COLUMN IF NOT EXISTS portada_url TEXT;

-- -----------------------------------------------------
--  PLAYLIST: un usuario no puede tener dos playlists con el mismo nombre,
--  sin distinguir mayúsculas ("Rock" y "rock" chocan)
-- -----------------------------------------------------

-- Si ya hay nombres repetidos, a las más nuevas se les agrega su id al final
-- (ej: "Rock (7)"); si no, el índice único no se puede crear.
-- LEFT(.., 85) deja lugar para el id sin pasarse de los 100 caracteres.
UPDATE playlist p
SET nombre = LEFT(p.nombre, 85) || ' (' || p.id_playlist || ')'
WHERE EXISTS (
    SELECT 1 FROM playlist otra
    WHERE otra.id_usuario = p.id_usuario
      AND LOWER(otra.nombre) = LOWER(p.nombre)
      AND otra.id_playlist < p.id_playlist
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_playlist_usuario_nombre ON playlist (id_usuario, LOWER(nombre));

-- -----------------------------------------------------
--  ACTIVIDAD: se suman 'edito_playlist' y 'quito_de_playlist'
--  (quedan todos los tipos que ya existían)
-- -----------------------------------------------------
ALTER TABLE actividad DROP CONSTRAINT IF EXISTS actividad_tipo_check;
ALTER TABLE actividad ADD CONSTRAINT actividad_tipo_check
    CHECK (tipo IN ('agrego_cancion', 'quito_cancion', 'cambio_estado',
                    'puntuo', 'reseno', 'edito_resena',
                    'creo_playlist', 'borro_playlist', 'agrego_a_playlist',
                    'edito_playlist', 'quito_de_playlist'));

COMMIT;
