// Usuario que muestra la Home mientras no haya login.
// El seed (skmusic_seed_demo.sql) crea a "lucas" con id 1 en una base nueva.
// Se puede cambiar con EXPO_PUBLIC_DEMO_USUARIO_ID en Sk-Frontend/.env.local
// TODO: reemplazar por el usuario logueado cuando esté el auth.
export const DEMO_USUARIO_ID = Number(process.env.EXPO_PUBLIC_DEMO_USUARIO_ID) || 1;
