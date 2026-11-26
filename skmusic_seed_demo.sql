-- =====================================================
--  SKMusic - Datos de prueba (PostgreSQL)
--  Crea el usuario "lucas" con 12 canciones en su biblioteca,
--  6 puntuadas y 3 reseñas, para ver la Home con datos.
--
--  Correr DESPUÉS de skmusic_db_v2.sql. Se puede volver a correr:
--  pisa los datos de "lucas" sin tocar los de otros usuarios.
--
--  Login (cuando esté el auth):  lucas@skmusic.com / demo1234
-- =====================================================

BEGIN;

-- -----------------------------------------------------
--  Canciones (caché de Deezer, datos reales)
-- -----------------------------------------------------
INSERT INTO cancion (deezer_id, titulo, artista_deezer_id, artista_nombre, album_titulo, portada_url, duracion_seg) VALUES
  (1173622,    'Tainted Love',            1668,    'Soft Cell',           'The Very Best Of Soft Cell',    'https://cdn-images.dzcdn.net/images/cover/a809e8767a0cc557be1c894c5ed1c71e/250x250-000000-80-0-0.jpg', 160),
  (13247459,   'De Música Ligera',        4345,    'Soda Stereo',         'Me Verás Volver (Hits & Más)',  'https://cdn-images.dzcdn.net/images/cover/c8740ff412c45180d98441c84159f232/250x250-000000-80-0-0.jpg', 213),
  (537033822,  'Demoliendo Hoteles',      4300,    'Charly García',       'Piano Bar',                     'https://cdn-images.dzcdn.net/images/cover/6932458c3c7c49e91d2673d38685671e/250x250-000000-80-0-0.jpg', 134),
  (13255149,   'Crimen',                  1374,    'Gustavo Cerati',      'Ahí Vamos',                     'https://cdn-images.dzcdn.net/images/cover/994b58426935136ff774ff4ee880931b/250x250-000000-80-0-0.jpg', 232),
  (664107,     'Take on Me',              3106,    'a-ha',                'Hunting High and Low',          'https://cdn-images.dzcdn.net/images/cover/e0ce8977ab98d73bcea00fc838ece034/250x250-000000-80-0-0.jpg', 227),
  (908604612,  'Blinding Lights',         4050205, 'The Weeknd',          'After Hours',                   'https://cdn-images.dzcdn.net/images/cover/fd00ebd6d30d7253f813dba3bb1c66a9/250x250-000000-80-0-0.jpg', 200),
  (4091937401, 'Bohemian Rhapsody',       412,     'Queen',               'A Night At The Opera',          'https://cdn-images.dzcdn.net/images/cover/0b56f4eee05fa1ea753c5654b2cdb70c/250x250-000000-80-0-0.jpg', 354),
  (13247454,   'Persiana Americana',      4345,    'Soda Stereo',         'Me Verás Volver (Hits & Más)',  'https://cdn-images.dzcdn.net/images/cover/c8740ff412c45180d98441c84159f232/250x250-000000-80-0-0.jpg', 292),
  (3538068,    'Lamento Boliviano',       133049,  'Los Enanitos Verdes', 'Coleccion Aniversario',         'https://cdn-images.dzcdn.net/images/cover/ead1c2c48568faad177c85e59a511780/250x250-000000-80-0-0.jpg', 225),
  (13791930,   'Smells Like Teen Spirit', 415,     'Nirvana',             'Nevermind (Remastered)',        'https://cdn-images.dzcdn.net/images/cover/f0282817b697279e56df13909962a54a/250x250-000000-80-0-0.jpg', 301),
  (4603408,    'Billie Jean',             259,     'Michael Jackson',     'Michael Jackson''s This Is It', 'https://cdn-images.dzcdn.net/images/cover/a0ad67d1beb761f2cb9f8b60e5bcf07a/250x250-000000-80-0-0.jpg', 293),
  (136889400,  'Starboy',                 4050205, 'The Weeknd',          'Starboy',                       'https://cdn-images.dzcdn.net/images/cover/134778e4c4f19ea71c82408300925a9a/250x250-000000-80-0-0.jpg', 230)
ON CONFLICT (deezer_id) DO UPDATE SET
  titulo = EXCLUDED.titulo, artista_deezer_id = EXCLUDED.artista_deezer_id,
  artista_nombre = EXCLUDED.artista_nombre, album_titulo = EXCLUDED.album_titulo,
  portada_url = EXCLUDED.portada_url, duracion_seg = EXCLUDED.duracion_seg;

-- -----------------------------------------------------
--  Usuario demo (si ya existe se actualiza y conserva su id)
-- -----------------------------------------------------
INSERT INTO usuario (username, email, password_hash, nombre, bio)
VALUES ('lucas', 'lucas@skmusic.com',
        '$2b$10$eSI0484tTuvzgf7gskBDeeeJOJXRhL66Ov5mBmniMggZcuKSw0iQW',  -- bcrypt de "demo1234"
        'Lucas Fernández', 'Rock nacional y synth-pop ochentoso.')
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
  nombre = EXCLUDED.nombre, bio = EXCLUDED.bio;

-- Limpia lo anterior del usuario demo para que el seed sea repetible
DELETE FROM biblioteca WHERE id_usuario = (SELECT id_usuario FROM usuario WHERE username = 'lucas');
DELETE FROM resena     WHERE id_usuario = (SELECT id_usuario FROM usuario WHERE username = 'lucas');

-- -----------------------------------------------------
--  Biblioteca: 12 canciones, 4 escuchadas, 6 puntuadas
--  (solo usa estados que existen antes y después de la migración 01)
-- -----------------------------------------------------
INSERT INTO biblioteca (id_usuario, deezer_id, estado, puntuacion, agregada_en)
SELECT u.id_usuario, b.deezer_id, b.estado, b.puntuacion, NOW() - b.hace
FROM usuario u
CROSS JOIN (VALUES
  (1173622::BIGINT,    'escuchado',       5::SMALLINT, INTERVAL '6 days'),
  (13247459::BIGINT,   'escuchado',       5::SMALLINT, INTERVAL '5 days'),
  (537033822::BIGINT,  'escuchado',       5::SMALLINT, INTERVAL '5 days'),
  (13255149::BIGINT,   'escuchado',       4::SMALLINT, INTERVAL '4 days'),
  (664107::BIGINT,     'escuchando',      4::SMALLINT, INTERVAL '3 days'),
  (908604612::BIGINT,  'escuchando',      4::SMALLINT, INTERVAL '2 days'),
  (4091937401::BIGINT, 'escuchando',      NULL,        INTERVAL '2 days'),
  (13247454::BIGINT,   'quiero_escuchar', NULL,        INTERVAL '1 day'),
  (3538068::BIGINT,    'quiero_escuchar', NULL,        INTERVAL '1 day'),
  (13791930::BIGINT,   'quiero_escuchar', NULL,        INTERVAL '12 hours'),
  (4603408::BIGINT,    'quiero_escuchar', NULL,        INTERVAL '6 hours'),
  (136889400::BIGINT,  'quiero_escuchar', NULL,        INTERVAL '1 hour')
) AS b(deezer_id, estado, puntuacion, hace)
WHERE u.username = 'lucas';

-- -----------------------------------------------------
--  Reseñas: 3
-- -----------------------------------------------------
INSERT INTO resena (id_usuario, deezer_id, texto)
SELECT u.id_usuario, r.deezer_id, r.texto
FROM usuario u
CROSS JOIN (VALUES
  (13247459::BIGINT,  'Un himno. El final en vivo con el público cantando es imbatible.'),
  (537033822::BIGINT, 'Charly en su mejor momento: crudo, corto y perfecto.'),
  (13255149::BIGINT,  'Cerati solista en estado puro. La letra es una joya.')
) AS r(deezer_id, texto)
WHERE u.username = 'lucas';

COMMIT;
