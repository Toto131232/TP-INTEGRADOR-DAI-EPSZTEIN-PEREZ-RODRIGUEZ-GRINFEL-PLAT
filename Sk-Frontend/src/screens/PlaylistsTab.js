import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../components/BottomSheet';
import ConfirmSheet from '../components/ConfirmSheet';
import PlaylistForm from '../components/PlaylistForm';
import PlaylistRow from '../components/PlaylistRow';
import { Cargando, ErrorBox, Vacio } from '../components/ScreenStates';
import * as playlistsApi from '../api/playlists';
import { useAuth } from '../auth/AuthContext';
import { cantidadCanciones } from '../formato';
import { colors, radius } from '../theme';

// Pestaña "Playlists" de Tu biblioteca (se muestra dentro de LibraryScreen).
// onOpenPlaylist(idPlaylist): abre el detalle de una playlist.
// La lista se pide al backend cada vez que se muestra la pestaña, así al volver del
// detalle las cantidades de canciones están actualizadas.
export default function PlaylistsTab({ onOpenPlaylist }) {
  const { usuario } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [creando, setCreando] = useState(false); // formulario de playlist nueva abierto
  const [aBorrar, setABorrar] = useState(null); // playlist que se quiere borrar (null = sin confirmación)
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState(null);

  const controllerRef = useRef(null);

  const cargar = useCallback(async (refrescando = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (refrescando) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await playlistsApi.getPlaylists({ signal: controller.signal });
      setPlaylists(res.playlists);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      // Solo el último pedido apaga el indicador de carga
      if (controllerRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    cargar();
    return () => controllerRef.current?.abort();
  }, [cargar]);

  // La playlist ya se creó en el backend: se cierra el formulario y se vuelve a pedir la lista
  const playlistCreada = () => {
    setCreando(false);
    cargar();
  };

  const pedirBorrar = useCallback((playlist) => {
    setErrorBorrar(null);
    setABorrar(playlist);
  }, []);

  const borrar = async () => {
    setBorrando(true);
    setErrorBorrar(null);
    try {
      await playlistsApi.deletePlaylist(aBorrar.id_playlist);
      setABorrar(null);
      cargar();
    } catch (err) {
      setErrorBorrar(err.message);
      if (err.status === 404) cargar(); // ya no existía: se actualiza la lista
    } finally {
      setBorrando(false);
    }
  };

  const abrir = useCallback((playlist) => onOpenPlaylist(playlist.id_playlist), [onOpenPlaylist]);

  if (loading && playlists.length === 0 && !error) return <Cargando />;

  return (
    <View style={styles.flex}>
      <FlatList
        data={error ? [] : playlists}
        keyExtractor={(item) => String(item.id_playlist)}
        renderItem={({ item }) => (
          <PlaylistRow playlist={item} username={usuario?.username} onPress={abrir} onBorrar={pedirBorrar} />
        )}
        // La card "Crear playlist" va arriba de la lista; si no hay playlists se muestra el estado vacío
        ListHeaderComponent={!error && playlists.length > 0 ? <CrearCard onPress={() => setCreando(true)} /> : null}
        ListEmptyComponent={
          error ? (
            <ErrorBox mensaje={error} onPress={() => cargar()} />
          ) : (
            <Vacio
              icono="albums-outline"
              titulo="Todavía no tenés playlists"
              texto="Armá tu primera playlist y sumale las canciones que quieras."
              boton="Crear mi primera playlist"
              onPress={() => setCreando(true)}
            />
          )
        }
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => cargar(true)}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />

      <BottomSheet visible={creando} onClose={() => setCreando(false)}>
        {creando ? <PlaylistForm onListo={playlistCreada} onCancelar={() => setCreando(false)} /> : null}
      </BottomSheet>

      <ConfirmSheet
        visible={aBorrar !== null}
        titulo="¿Borrar la playlist?"
        texto={
          aBorrar
            ? `Se va a borrar “${aBorrar.nombre}” (${cantidadCanciones(aBorrar.cantidad_canciones)}). ` +
              'Las canciones no se borran de tu biblioteca.'
            : ''
        }
        boton="Borrar"
        enviando={borrando}
        error={errorBorrar}
        onCancelar={() => setABorrar(null)}
        onConfirmar={borrar}
      />
    </View>
  );
}

function CrearCard({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.crear, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.crearIcono}>
        <Ionicons name="add" size={30} color={colors.accentText} />
      </View>
      <View style={styles.crearTexto}>
        <Text style={styles.crearTitulo}>Crear playlist</Text>
        <Text style={styles.crearSubtitulo}>Ponele nombre y sumale canciones</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lista: { paddingBottom: 24, flexGrow: 1 },
  pressed: { opacity: 0.7 },

  crear: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 10,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  crearIcono: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crearTexto: { flex: 1, marginLeft: 14 },
  crearTitulo: { color: colors.text, fontSize: 16, fontWeight: '700' },
  crearSubtitulo: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
});
