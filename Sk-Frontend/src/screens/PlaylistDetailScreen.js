import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '../components/BottomSheet';
import ConfirmSheet from '../components/ConfirmSheet';
import PlaylistCover from '../components/PlaylistCover';
import PlaylistForm from '../components/PlaylistForm';
import PlaylistSongRow from '../components/PlaylistSongRow';
import { Cargando, ErrorBox, Vacio } from '../components/ScreenStates';
import * as playlistsApi from '../api/playlists';
import { useAuth } from '../auth/AuthContext';
import { aFormatoBuscador, cantidadCanciones, duracionTotal } from '../formato';
import { colors, radius } from '../theme';

// Detalle de una playlist: cabecera (portada, nombre, datos y botones) y lista numerada de canciones.
// Props:
// - idPlaylist: la playlist a mostrar (se pide al backend al entrar)
// - onBack(): volver a la lista de playlists
// - onNavigate(tab): "+ Agregar" y "Buscar canciones" llevan a la pestaña Buscar
// - onOpenSong(song): opcional. Si está, tocar una canción abre su detalle.
export default function PlaylistDetailScreen({ idPlaylist, onBack, onNavigate, onOpenSong }) {
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { status, mensaje }

  const [editando, setEditando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [aQuitar, setAQuitar] = useState(null); // canción que se quiere quitar (null = sin confirmación)
  const [enviando, setEnviando] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);

  const controllerRef = useRef(null);

  const cargar = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      setPlaylist(await playlistsApi.getPlaylist(idPlaylist, { signal: controller.signal }));
    } catch (err) {
      if (err.name !== 'AbortError') setError({ status: err.status, mensaje: err.message });
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  }, [idPlaylist]);

  useEffect(() => {
    cargar();
    return () => controllerRef.current?.abort();
  }, [cargar]);

  // Ejecuta una acción de los menús: deshabilita los botones mientras tanto y muestra el error
  const ejecutar = async (accion) => {
    setEnviando(true);
    setErrorAccion(null);
    try {
      await accion();
    } catch (err) {
      setErrorAccion(err.message);
      if (err.status === 404) {
        // La playlist (o la canción) ya no estaba: se cierran los menús y se pide todo de nuevo
        setConfirmarBorrar(false);
        setAQuitar(null);
        cargar();
      }
    } finally {
      setEnviando(false);
    }
  };

  const borrarPlaylist = () =>
    ejecutar(async () => {
      await playlistsApi.deletePlaylist(idPlaylist);
      onBack(); // la lista se vuelve a pedir al mostrarse
    });

  const quitarCancion = () =>
    ejecutar(async () => {
      await playlistsApi.removeSong(idPlaylist, aQuitar.deezer_id);
      setAQuitar(null);
      cargar(); // el backend reacomoda las posiciones: se muestra lo que devuelve
    });

  const pedirQuitar = useCallback((cancion) => {
    setErrorAccion(null);
    setAQuitar(cancion);
  }, []);

  const abrirCancion = useCallback((cancion) => onOpenSong(aFormatoBuscador(cancion)), [onOpenSong]);

  const playlistEditada = () => {
    setEditando(false);
    cargar();
  };

  // Todavía no hay datos, o hubo un error: botón de volver + carga / error / no encontrada
  if (!playlist || error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.topBar, styles.topBarSolo]}>
          <BotonRedondo icono="chevron-back" label="Volver" onPress={onBack} relleno />
        </View>
        {error?.status === 404 ? (
          <Vacio
            icono="albums-outline"
            titulo="Playlist no encontrada"
            texto="Puede que se haya borrado."
            boton="Volver a mis playlists"
            onPress={onBack}
          />
        ) : null}
        {error && error.status !== 404 ? <ErrorBox mensaje={error.mensaje} onPress={cargar} /> : null}
        {!error ? <Cargando /> : null}
      </View>
    );
  }

  const { canciones } = playlist;
  // Duración total: suma de la duración de cada canción
  const totalSegundos = canciones.reduce((total, c) => total + (c.duracion_seg ?? 0), 0);
  const meta = [
    usuario?.username ? `de ${usuario.username}` : null,
    cantidadCanciones(playlist.cantidad_canciones),
    totalSegundos > 0 ? duracionTotal(totalSegundos) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const cabecera = (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.topBar}>
        <BotonRedondo icono="chevron-back" label="Volver" onPress={onBack} relleno />
        {loading ? <ActivityIndicator color={colors.accent} /> : null}
      </View>

      <View style={styles.portada}>
        <PlaylistCover playlist={playlist} size={180} radius={radius.md} />
      </View>

      <Text style={styles.nombre}>{playlist.nombre}</Text>
      {playlist.descripcion ? <Text style={styles.descripcion}>{playlist.descripcion}</Text> : null}
      <Text style={styles.meta}>{meta}</Text>

      <View style={styles.acciones}>
        <BotonRedondo icono="pencil-outline" label="Editar playlist" onPress={() => setEditando(true)} />
        <BotonRedondo
          icono="trash-outline"
          label="Borrar playlist"
          onPress={() => {
            setErrorAccion(null);
            setConfirmarBorrar(true);
          }}
        />
        <Pressable
          onPress={() => onNavigate('buscar')}
          style={({ pressed }) => [styles.agregar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Agregar canciones desde Buscar"
        >
          <Ionicons name="add" size={20} color={colors.text} />
          <Text style={styles.agregarText}>Agregar</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={canciones}
        keyExtractor={(item) => String(item.deezer_id)}
        renderItem={({ item }) => (
          <PlaylistSongRow cancion={item} onPress={onOpenSong ? abrirCancion : undefined} onQuitar={pedirQuitar} />
        )}
        ListHeaderComponent={cabecera}
        ListHeaderComponentStyle={styles.headerEspacio}
        ListEmptyComponent={
          <Vacio
            icono="musical-notes-outline"
            titulo="Esta playlist está vacía"
            texto="Buscá canciones y sumalas con el botón “+” de cada resultado."
            boton="Buscar canciones"
            onPress={() => onNavigate('buscar')}
          />
        }
        contentContainerStyle={styles.lista}
      />

      <BottomSheet visible={editando} onClose={() => setEditando(false)}>
        {editando ? (
          <PlaylistForm playlist={playlist} onListo={playlistEditada} onCancelar={() => setEditando(false)} />
        ) : null}
      </BottomSheet>

      <ConfirmSheet
        visible={confirmarBorrar}
        titulo="¿Borrar la playlist?"
        texto={`Se va a borrar “${playlist.nombre}” (${cantidadCanciones(playlist.cantidad_canciones)}). Las canciones no se borran de tu biblioteca.`}
        boton="Borrar"
        enviando={enviando}
        error={errorAccion}
        onCancelar={() => setConfirmarBorrar(false)}
        onConfirmar={borrarPlaylist}
      />

      <ConfirmSheet
        visible={aQuitar !== null}
        icono="remove-circle-outline"
        titulo="¿Quitar de la playlist?"
        texto={aQuitar ? `Se va a quitar “${aQuitar.titulo}” de ${aQuitar.artista_nombre} de “${playlist.nombre}”.` : ''}
        boton="Quitar"
        enviando={enviando}
        error={errorAccion}
        onCancelar={() => setAQuitar(null)}
        onConfirmar={quitarCancion}
      />
    </View>
  );
}

// Botón redondo con un ícono. relleno = fondo oscuro (volver); si no, solo borde (editar, borrar).
function BotonRedondo({ icono, label, onPress, relleno = false }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.redondo, relleno ? styles.redondoRelleno : styles.redondoBorde, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icono} size={20} color={colors.text} />
    </Pressable>
  );
}

const PADDING = 20;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.7 },
  lista: { paddingBottom: 24, flexGrow: 1 },

  header: { backgroundColor: colors.headerBlue, paddingHorizontal: PADDING, paddingBottom: 22 },
  headerEspacio: { marginBottom: 10 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 40,
  },
  topBarSolo: { paddingHorizontal: PADDING },
  portada: { alignSelf: 'center', marginTop: 4, marginBottom: 22 },
  nombre: { color: colors.text, fontSize: 26, fontWeight: '800' },
  descripcion: { color: colors.text, fontSize: 14, marginTop: 6, opacity: 0.85 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 6 },

  acciones: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  redondo: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  redondoRelleno: { backgroundColor: colors.overlay },
  redondoBorde: { borderWidth: 1.5, borderColor: colors.textMuted },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  agregarText: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
