import { query } from '../config/db.js';

// Campos que se pueden devolver al cliente (nunca password_hash)
const PUBLIC_FIELDS = 'id_usuario, username, email, nombre, avatar_url, bio, creado_en';

export const findByUsername = async (username) => {
  const { rows } = await query(
    `SELECT ${PUBLIC_FIELDS}, password_hash FROM usuario WHERE username = $1`,
    [username],
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const { rows } = await query(`SELECT ${PUBLIC_FIELDS} FROM usuario WHERE id_usuario = $1`, [id]);
  return rows[0] || null;
};

export const findByUsernameOrEmail = async (username, email) => {
  const { rows } = await query(
    'SELECT username, email FROM usuario WHERE username = $1 OR email = $2',
    [username, email],
  );
  return rows;
};

export const create = async ({ username, email, passwordHash, nombre }) => {
  const { rows } = await query(
    `INSERT INTO usuario (username, email, password_hash, nombre)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_FIELDS}`,
    [username, email, passwordHash, nombre ?? null],
  );
  return rows[0];
};
