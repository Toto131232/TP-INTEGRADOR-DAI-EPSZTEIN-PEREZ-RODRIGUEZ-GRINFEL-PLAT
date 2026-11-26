-- =====================================================
--  SKMusic - Migración 02 (PostgreSQL)
--  Agrega el "me gusta" (corazón) a las canciones de la biblioteca.
--  Correr una sola vez sobre una base creada con skmusic_db_v2.sql
--  (se puede volver a correr sin problema)
-- =====================================================

BEGIN;

ALTER TABLE biblioteca ADD COLUMN IF NOT EXISTS me_gusta BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
