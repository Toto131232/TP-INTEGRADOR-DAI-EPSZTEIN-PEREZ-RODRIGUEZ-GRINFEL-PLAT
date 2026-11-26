// Funciones para mostrar datos (las usan las pantallas de playlists).

// 215 -> "3:35"
export const duracion = (segundos) => {
  if (!segundos) return '';
  const m = Math.floor(segundos / 60);
  const s = String(segundos % 60).padStart(2, '0');
  return `${m}:${s}`;
};

// 2880 -> "48 min",  4500 -> "1 h 15 min"
export const duracionTotal = (segundos) => {
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
};

// 1 -> "1 canción",  3 -> "3 canciones"
export const cantidadCanciones = (n) => `${n} ${n === 1 ? 'canción' : 'canciones'}`;

// "Soda Stereo" -> "SS",  "a-ha" -> "AH",  "Queen" -> "QU"
export const iniciales = (texto) => {
  const palabras = (texto || '?').split(/[\s\-_.]+/).filter(Boolean);
  const letras =
    palabras.length > 1 ? palabras[0][0] + palabras[palabras.length - 1][0] : (palabras[0] ?? '?').slice(0, 2);
  return letras.toUpperCase();
};

// El detalle de canción (está en otra rama) usa el formato del buscador (camelCase).
// Es la misma conversión que hace LibraryScreen con las canciones de la biblioteca.
export const aFormatoBuscador = (c) => ({
  deezerId: c.deezer_id,
  titulo: c.titulo,
  artista: { nombre: c.artista_nombre },
  album: { titulo: c.album_titulo, portadaUrl: c.portada_url },
  duracionSeg: c.duracion_seg,
});
