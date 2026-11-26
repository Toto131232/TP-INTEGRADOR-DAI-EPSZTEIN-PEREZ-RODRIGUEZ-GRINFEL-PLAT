import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import Cover from './Cover';
import PlaylistCover from './PlaylistCover';
import PlaylistForm from './PlaylistForm';
import { Aviso } from './ScreenStates';
import * as playlistsApi from '../api/playlists';
import { cantidadCanciones } from '../formato';
import { colors, radius } from '../theme';

// "Agregar a playlist": lista las playlists del usuario y agrega la canción a la que se toque.
// También deja crear una playlist nueva y agregarle la canción ahí mismo.
// cancion: en el formato del buscador ({ deezerId, titulo, artista: { nombre }, album: { portadaUrl } }).
// Con cancion = null el panel está cerrado.
// Para usarlo en otra pantalla (por ejemplo el detalle de canción):
//   const [paraAgregar, setParaAgregar] = useState(null);
//   <AddToPlaylistSheet cancion={paraAgregar} onClose={() => setParaAgregar(null)} />
export default function AddToPlaylistSheet({ cancion, onClose }) {
  const [modo, setModo] = useState('lista'); // 'lista' | 'crear' (formulario de playlist nueva)
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [agregandoA, setAgregandoA] = useState(null); // id de la playlist a la que se está agregando
  const [aviso, setAviso] = useState(null); // { tipo: 'exito' | 'error', texto }
  const controllerRef = useRef(null);

  const deezerId = cancion?.deezerId;

  const cargar = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await playlistsApi.getPlaylists({ signal: controller.signal });
      setPlaylists(res.playlists);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  }, []);

  // Cada vez que se abre para una canción: vuelve a la lista y pide las playlists al backend
  useEffect(() => {
    if (deezerId == null) return undefined;
    setModo('lista');
    setAviso(null);
    cargar();
    return () => controllerRef.current?.abort();
  }, [deezerId, cargar]);

  const agregar = async (playlist) => {
    setAgregandoA(playlist.id_playlist);
    setAviso(null);
    try {
      await playlistsApi.addSong(playlist.id_playlist, deezerId);
      setAviso({ tipo: 'exito', texto: `Se agregó a “${playlist.nombre}”` });
    } catch (err) {
      // 409 = la canción ya estaba en esa playlist
      setAviso({ tipo: 'error', texto: err.status === 409 ? `Ya estaba en “${playlist.nombre}”` : err.message });
    } finally {
      setAgregandoA(null);
    }
    cargar(); // se vuelve a pedir la lista para mostrar la cantidad de canciones real
  };

  // La playlist nueva ya se creó en el backend: ahora se le agrega la canción
  const crearYAgregar = (nueva) => {
    setModo('lista');
    agregar(nueva);
  };

  const ocupado = agregandoA !== null;

  return (
    <BottomSheet visible={cancion !== null} onClose={onClose}>
      {cancion && modo === 'crear' ? (
        <PlaylistForm textoBoton="Crear y agregar" onListo={crearYAgregar} onCancelar={() => setModo('lista')} />
      ) : null}

      {cancion && modo === 'lista' ? (
        <>
          <View style={styles.cabecera}>
            <Cover uri={cancion.album?.portadaUrl} size={48} radius={radius.sm} />
            <View style={styles.cabeceraTexto}>
              <Text style={styles.titulo}>Agregar a playlist</Text>
              <Text style={styles.subtitulo} numberOfLines={1}>
                {cancion.titulo} · {cancion.artista?.nombre}
              </Text>
            </View>
          </View>

          {aviso ? <Aviso tipo={aviso.tipo} texto={aviso.texto} /> : null}

          <ScrollView style={styles.lista} keyboardShouldPersistTaps="handled">
            <Pressable
              onPress={() => setModo('crear')}
              disabled={ocupado}
              style={({ pressed }) => [styles.fila, (pressed || ocupado) && styles.apagada]}
              accessibilityRole="button"
            >
              <View style={styles.nueva}>
                <Ionicons name="add" size={26} color={colors.accentText} />
              </View>
              <Text style={styles.nombre}>Nueva playlist</Text>
            </Pressable>

            {loading && playlists.length === 0 ? (
              <ActivityIndicator style={styles.cargando} color={colors.accent} />
            ) : null}

            {error ? (
              <View>
                <Aviso texto={error} />
                <Pressable onPress={cargar} style={styles.reintentar} accessibilityRole="button">
                  <Text style={styles.reintentarText}>Reintentar</Text>
                </Pressable>
              </View>
            ) : null}

            {!loading && !error && playlists.length === 0 ? (
              <Text style={styles.vacio}>Todavía no tenés playlists. Creá una y la canción se agrega ahí.</Text>
            ) : null}

            {!error &&
              playlists.map((p) => (
                <Pressable
                  key={p.id_playlist}
                  onPress={() => agregar(p)}
                  disabled={ocupado}
                  style={({ pressed }) => [styles.fila, (pressed || (ocupado && agregandoA !== p.id_playlist)) && styles.apagada]}
                  accessibilityRole="button"
                  accessibilityLabel={`Agregar a ${p.nombre}`}
                >
                  <PlaylistCover playlist={p} size={44} radius={radius.sm} />
                  <View style={styles.info}>
                    <Text style={styles.nombre} numberOfLines={1}>{p.nombre}</Text>
                    <Text style={styles.meta}>{cantidadCanciones(p.cantidad_canciones)}</Text>
                  </View>
                  {agregandoA === p.id_playlist ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <Ionicons name="add-circle-outline" size={24} color={colors.textMuted} />
                  )}
                </Pressable>
              ))}
          </ScrollView>

          <Pressable onPress={onClose} style={styles.listo} accessibilityRole="button">
            <Text style={styles.listoText}>Listo</Text>
          </Pressable>
        </>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center' },
  cabeceraTexto: { flex: 1, marginLeft: 12 },
  titulo: { color: colors.text, fontSize: 17, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  lista: { marginTop: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  apagada: { opacity: 0.5 },
  nueva: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  nombre: { flexShrink: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cargando: { marginVertical: 16 },
  vacio: { color: colors.textMuted, fontSize: 14, paddingVertical: 12 },
  reintentar: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 6 },
  reintentarText: { color: colors.accent, fontWeight: '700' },

  listo: {
    height: 48,
    marginTop: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listoText: { color: colors.text, fontSize: 15, fontWeight: '700' },
});
