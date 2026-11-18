-- =====================================================
--  SKMusic - Migración 01 (PostgreSQL)
--  Se elimina el estado 'favorito' de la biblioteca.
--  Correr una sola vez sobre una base creada con skmusic_db_v2.sql
--  (se puede volver a correr sin problema)
-- =====================================================

BEGIN;

-- -----------------------------------------------------
--  BIBLIOTECA: estado pasa a tener 3 valores
--  Antes: 'quiero_escuchar', 'escuchando', 'escuchado', 'favorito'
-- -----------------------------------------------------

-- Si alguna canción quedó como 'favorito', pasa a 'escuchado'
-- (para marcarla como favorita la tuvo que haber escuchado)
UPDATE biblioteca SET estado = 'escuchado' WHERE estado = 'favorito';

ALTER TABLE biblioteca DROP CONSTRAINT IF EXISTS biblioteca_estado_check;
ALTER TABLE biblioteca ADD CONSTRAINT biblioteca_estado_check
    CHECK (estado IN ('quiero_escuchar', 'escuchando', 'escuchado'));

COMMIT;
