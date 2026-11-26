import { apiDelete, apiGet, apiPatch, apiPost } from './client';

// Playlists del usuario logueado (todas van con token: lo agrega client.js).
// Una playlist viene así: { id_playlist, nombre, descripcion, portada_url, creada_en, cantidad_canciones }
// Una canción de la playlist: { deezer_id, titulo, artista_nombre, album_titulo, portada_url,
//                               duracion_seg, posicion, agregada_en }

// GET /api/playlists -> { total, playlists }
export const getPlaylists = ({ signal } = {}) => apiGet('/playlists', {}, { signal });

// GET /api/playlists/:idPlaylist -> { playlist } con canciones[] ordenadas por posición
export const getPlaylist = async (idPlaylist, { signal } = {}) =>
  (await apiGet(`/playlists/${idPlaylist}`, {}, { signal })).playlist;

// POST /api/playlists   body: { nombre, descripcion, portada_url } -> { playlist }
export const createPlaylist = async (datos) => (await apiPost('/playlists', datos)).playlist;

// PATCH /api/playlists/:idPlaylist   body: solo los campos que cambian -> { playlist }
// descripcion o portada_url en null las borran.
export const updatePlaylist = async (idPlaylist, cambios) =>
  (await apiPatch(`/playlists/${idPlaylist}`, cambios)).playlist;

// DELETE /api/playlists/:idPlaylist -> 204 (sin cuerpo)
export const deletePlaylist = (idPlaylist) => apiDelete(`/playlists/${idPlaylist}`);

// POST /api/playlists/:idPlaylist/songs   body: { deezer_id } -> { cancion }
export const addSong = async (idPlaylist, deezerId) =>
  (await apiPost(`/playlists/${idPlaylist}/songs`, { deezer_id: deezerId })).cancion;

// DELETE /api/playlists/:idPlaylist/songs/:deezerId -> 204 (sin cuerpo)
export const removeSong = (idPlaylist, deezerId) =>
  apiDelete(`/playlists/${idPlaylist}/songs/${deezerId}`);
