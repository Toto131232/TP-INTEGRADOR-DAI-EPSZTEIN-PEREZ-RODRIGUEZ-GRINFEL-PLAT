// Convierte un track crudo de Deezer al formato que usa la app.
// Las claves siguen los nombres de la tabla `cancion` de la BD.
export const toSong = (track) => ({
  deezerId: track.id,
  titulo: track.title,
  artista: {
    deezerId: track.artist?.id ?? null,
    nombre: track.artist?.name ?? 'Desconocido',
  },
  album: {
    deezerId: track.album?.id ?? null,
    titulo: track.album?.title ?? null,
    portadaUrl: track.album?.cover_medium ?? null,
  },
  duracionSeg: track.duration ?? null,
  explicito: Boolean(track.explicit_lyrics),
});
