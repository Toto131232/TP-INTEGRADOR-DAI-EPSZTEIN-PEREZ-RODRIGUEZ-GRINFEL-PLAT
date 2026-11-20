import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '../components/BottomSheet';
import LibraryRow from '../components/LibraryRow';
import PrimaryButton from '../components/PrimaryButton';
import SongActionsSheet from '../components/SongActionsSheet';
import PlaylistsTab from './PlaylistsTab';
import * as libraryApi from '../api/library';
import { useAuth } from '../auth/AuthContext';
import { ESTADOS } from '../estados';
import { colors, radius } from '../theme';

const SECCIONES = [
  { key: 'canciones', label: 'Canciones' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'resenas', label: 'Mis reseñas' },
];

// Órdenes que acepta el backend: orden = fecha | puntuacion, direccion = asc | desc
const ORDENES = [
  { key: 'recientes', label: 'Agregadas recientemente', orden: 'fecha', direccion: 'desc' },
  { key: 'antiguas', label: 'Agregadas primero', orden: 'fecha', direccion: 'asc' },
  { key: 'mejores', label: 'Mejor puntuadas', orden: 'puntuacion', direccion: 'desc' },
];

// Filtro puntuacion_min del backend (null = sin filtro)
const PUNTUACIONES_MIN = [
  { valor: null, label: 'Cualquiera' },
  { valor: 3, label: '3★ o más' },
  { valor: 4, label: '4★ o más' },
  { valor: 5, label: '5★' },
];

const iniciales = (usuario) => {
  const base = (usuario?.nombre || usuario?.username || '?').trim();
  const partes = base.split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : base.slice(0, 2);
  return letras.toUpperCase();
};

// El detalle de canción usa el formato del buscador (camelCase), no el de la biblioteca
const aFormatoBuscador = (c) => ({
  deezerId: c.deezer_id,
  titulo: c.titulo,
  artista: { nombre: c.artista_nombre },
  album: { titulo: c.album_titulo, portadaUrl: c.portada_url },
  duracionSeg: c.duracion_seg,
  fechaLanzamiento: c.fecha_lanzamiento,
});

// Props:
// - onNavigate(tab): para ir a Buscar
// - onOpenSong(song): opcional. Si está, tocar una canción abre su detalle;
//   si no, abre el menú de acciones.
// - refreshKey: opcional. Cada vez que cambia se vuelve a pedir la lista
//   (sirve para refrescar al cerrar el detalle de una canción).
// - seccion / onChangeSeccion: la sección elegida (canciones, playlists, resenas). La guarda
//   App.js para que al volver del detalle de una playlist se siga viendo la pestaña Playlists.
// - onOpenPlaylist(idPlaylist): abre el detalle de una playlist.
export default function LibraryScreen({
  onNavigate,
  onOpenSong,
  refreshKey,
  seccion,
  onChangeSeccion,
  onOpenPlaylist,
}) {
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        {usuario?.avatarUrl ? (
          <Image source={{ uri: usuario.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{iniciales(usuario)}</Text>
          </View>
        )}
        <Text style={styles.titulo} numberOfLines={1}>Tu biblioteca</Text>
        <Pressable
          onPress={() => onNavigate?.('buscar')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Buscar canciones para agregar"
        >
          <Ionicons name="add" size={30} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.secciones}>
        {SECCIONES.map((s) => (
          <Chip
            key={s.key}
            label={s.label}
            activo={s.key === seccion}
            variante="seccion"
            onPress={() => onChangeSeccion(s.key)}
          />
        ))}
      </View>

      {seccion === 'canciones' ? (
        <Canciones onNavigate={onNavigate} onOpenSong={onOpenSong} refreshKey={refreshKey} />
      ) : null}
      {seccion === 'playlists' ? <PlaylistsTab onOpenPlaylist={onOpenPlaylist} /> : null}
      {seccion === 'resenas' ? (
        <Proximamente
          icono="chatbubble-ellipses-outline"
          texto="Tus reseñas todavía no se pueden ver desde acá."
        />
      ) : null}
    </View>
  );
}

function Canciones({ onNavigate, onOpenSong, refreshKey }) {
  // Filtros y orden (se mandan al backend)
  const [filtroEstado, setFiltroEstado] = useState(null);
  const [puntuacionMin, setPuntuacionMin] = useState(null);
  const [ordenKey, setOrdenKey] = useState('recientes');
  const [opcionesVisibles, setOpcionesVisibles] = useState(false);

  // Lista
  const [canciones, setCanciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Menú de acciones: canción elegida (null = cerrado) y qué muestra ('acciones' o 'quitar')
  const [seleccionada, setSeleccionada] = useState(null);
  const [modo, setModo] = useState('acciones');
  const [enviando, setEnviando] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);

  // Guarda el pedido en curso para poder cancelarlo si llega uno nuevo
  const controllerRef = useRef(null);

  const orden = ORDENES.find((o) => o.key === ordenKey);
  const hayFiltros = filtroEstado !== null || puntuacionMin !== null;

  const cargar = useCallback(
    async (refrescando = false) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (refrescando) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { orden: columna, direccion } = ORDENES.find((o) => o.key === ordenKey);
      try {
        const res = await libraryApi.getLibrary(
          { estado: filtroEstado, puntuacionMin, orden: columna, direccion },
          { signal: controller.signal },
        );
        setCanciones(res.canciones);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        // Solo el último pedido apaga el indicador de carga
        if (controllerRef.current === controller) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [filtroEstado, puntuacionMin, ordenKey],
  );

  // Se pide la lista al entrar, cuando cambia un filtro/orden y cuando cambia refreshKey
  useEffect(() => {
    cargar();
  }, [cargar, refreshKey]);

  // Al salir de la pantalla se cancela el pedido pendiente
  useEffect(() => () => controllerRef.current?.abort(), []);

  const abrirAcciones = useCallback((c) => {
    setErrorAccion(null);
    setModo('acciones');
    setSeleccionada(c);
  }, []);

  const pedirQuitar = useCallback((c) => {
    setErrorAccion(null);
    setModo('quitar');
    setSeleccionada(c);
  }, []);

  const tocarCancion = useCallback(
    (c) => (onOpenSong ? onOpenSong(aFormatoBuscador(c)) : abrirAcciones(c)),
    [onOpenSong, abrirAcciones],
  );

  const cerrarMenu = () => setSeleccionada(null);

  // Muestra la canción que devolvió el backend. Si el cambio puede sacarla de la lista
  // o cambiar el orden, se vuelve a pedir la lista entera.
  const mostrarActualizada = (actualizada, recargar) => {
    setSeleccionada((prev) => (prev?.deezer_id === actualizada.deezer_id ? actualizada : prev));
    if (recargar) {
      cargar();
    } else {
      setCanciones((prev) =>
        prev.map((c) => (c.deezer_id === actualizada.deezer_id ? actualizada : c)),
      );
    }
  };

  // Ejecuta una acción del menú: deshabilita los botones mientras tanto y muestra el error
  const enviar = async (accion) => {
    setEnviando(true);
    setErrorAccion(null);
    try {
      await accion();
    } catch (err) {
      setErrorAccion(err.message);
      if (err.status === 404) cargar(); // ya no estaba en la biblioteca: se actualiza la lista
    } finally {
      setEnviando(false);
    }
  };

  const cambiarEstado = (estado) => {
    if (!seleccionada || estado === seleccionada.estado) return;
    const id = seleccionada.deezer_id;
    enviar(async () => {
      const actualizada = await libraryApi.setEstado(id, estado);
      mostrarActualizada(actualizada, filtroEstado !== null);
    });
  };

  const puntuar = (puntuacion) => {
    if (!seleccionada || puntuacion === seleccionada.puntuacion) return;
    const id = seleccionada.deezer_id;
    enviar(async () => {
      const actualizada = await libraryApi.setRating(id, puntuacion);
      mostrarActualizada(actualizada, puntuacionMin !== null || orden.orden === 'puntuacion');
    });
  };

  const quitar = () => {
    if (!seleccionada) return;
    const id = seleccionada.deezer_id;
    enviar(async () => {
      await libraryApi.removeFromLibrary(id);
      setCanciones((prev) => prev.filter((c) => c.deezer_id !== id));
      setSeleccionada((prev) => (prev?.deezer_id === id ? null : prev));
    });
  };

  const limpiarFiltros = () => {
    setFiltroEstado(null);
    setPuntuacionMin(null);
  };

  const cantidad = canciones.length;
  const textoCantidad =
    `${cantidad} ${cantidad === 1 ? 'canción' : 'canciones'}` +
    (puntuacionMin ? ` · ${PUNTUACIONES_MIN.find((p) => p.valor === puntuacionMin).label}` : '');

  const renderVacio = () => {
    if (error) return <ErrorBox mensaje={error} onRetry={() => cargar()} />;
    if (loading) return null;
    if (hayFiltros) {
      return (
        <Vacio
          icono="filter-outline"
          titulo="No hay canciones con estos filtros"
          boton="Limpiar filtros"
          onPress={limpiarFiltros}
        />
      );
    }
    return (
      <Vacio
        icono="library-outline"
        titulo="Tu biblioteca está vacía"
        texto="Buscá canciones y agregalas para armar tu colección."
        boton="Ir a Buscar"
        onPress={() => onNavigate?.('buscar')}
      />
    );
  };

  return (
    <View style={styles.flex}>
      {/* Filtros por estado */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        <Chip label="Todas" activo={filtroEstado === null} onPress={() => setFiltroEstado(null)} />
        {ESTADOS.map((e) => (
          <Chip
            key={e.key}
            label={e.label}
            activo={filtroEstado === e.key}
            onPress={() => setFiltroEstado(e.key)}
          />
        ))}
      </ScrollView>

      {/* Cantidad + orden */}
      <View style={styles.barra}>
        <View style={styles.barraIzq}>
          {!error && !(loading && cantidad === 0) ? (
            <Text style={styles.cantidad}>{textoCantidad}</Text>
          ) : null}
          {loading && cantidad > 0 ? <ActivityIndicator size="small" color={colors.accent} /> : null}
        </View>
        <Pressable
          onPress={() => setOpcionesVisibles(true)}
          hitSlop={8}
          style={styles.ordenBoton}
          accessibilityRole="button"
          accessibilityLabel={`Ordenar y filtrar. Orden actual: ${orden.label}`}
        >
          <Ionicons name="swap-vertical" size={16} color={colors.text} />
          <Text style={styles.ordenText}>{orden.label}</Text>
        </Pressable>
      </View>

      {loading && cantidad === 0 && !error ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={error ? [] : canciones}
          keyExtractor={(item) => String(item.deezer_id)}
          renderItem={({ item }) => (
            <LibraryRow
              cancion={item}
              onPress={tocarCancion}
              onOpciones={abrirAcciones}
              onQuitar={pedirQuitar}
            />
          )}
          ListEmptyComponent={renderVacio}
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
      )}

      <SongActionsSheet
        cancion={seleccionada}
        modo={modo}
        enviando={enviando}
        error={errorAccion}
        onClose={cerrarMenu}
        onCambiarEstado={cambiarEstado}
        onPuntuar={puntuar}
        onPedirQuitar={() => setModo('quitar')}
        onConfirmarQuitar={quitar}
        onVerDetalle={
          onOpenSong
            ? () => {
                const c = seleccionada;
                cerrarMenu();
                onOpenSong(aFormatoBuscador(c));
              }
            : undefined
        }
      />

      <BottomSheet visible={opcionesVisibles} onClose={() => setOpcionesVisibles(false)}>
        <Text style={styles.sheetTitulo}>Ordenar por</Text>
        {ORDENES.map((o) => {
          const activo = o.key === ordenKey;
          return (
            <Pressable
              key={o.key}
              style={styles.opcion}
              onPress={() => {
                setOrdenKey(o.key);
                setOpcionesVisibles(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: activo }}
            >
              <Text style={[styles.opcionText, activo && styles.opcionActiva]}>{o.label}</Text>
              {activo ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
            </Pressable>
          );
        })}

        <Text style={[styles.sheetTitulo, styles.sheetTituloSeparado]}>Puntuación mínima</Text>
        <View style={styles.chipsWrap}>
          {PUNTUACIONES_MIN.map((p) => (
            <Chip
              key={String(p.valor)}
              label={p.label}
              activo={p.valor === puntuacionMin}
              onPress={() => {
                setPuntuacionMin(p.valor);
                setOpcionesVisibles(false);
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

// Píldora. variante 'seccion' = pestañas internas (activa blanca);
// variante 'filtro' = filtros (activa dorada)
function Chip({ label, activo, onPress, variante = 'filtro' }) {
  const estiloActivo = variante === 'seccion' ? styles.chipSeccionActivo : styles.chipFiltroActivo;
  const textoActivo = variante === 'seccion' ? styles.chipTextSeccion : styles.chipTextFiltro;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, activo && estiloActivo]}
      accessibilityRole="tab"
      accessibilityState={{ selected: activo }}
    >
      <Text style={[styles.chipText, activo && textoActivo]}>{label}</Text>
    </Pressable>
  );
}

function Vacio({ icono, titulo, texto, boton, onPress }) {
  return (
    <View style={styles.vacio}>
      <Ionicons name={icono} size={44} color={colors.textMuted} />
      <Text style={styles.vacioTitulo}>{titulo}</Text>
      {texto ? <Text style={styles.vacioTexto}>{texto}</Text> : null}
      <PrimaryButton title={boton} onPress={onPress} style={styles.vacioBoton} />
    </View>
  );
}

function ErrorBox({ mensaje, onRetry }) {
  return (
    <View style={styles.vacio}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.danger} />
      <Text style={styles.errorText}>{mensaje}</Text>
      <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
        <Text style={styles.retryText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function Proximamente({ icono, texto }) {
  return (
    <View style={[styles.center, styles.vacio]}>
      <Ionicons name={icono} size={44} color={colors.textMuted} />
      <Text style={styles.vacioTitulo}>Próximamente</Text>
      <Text style={styles.vacioTexto}>{texto}</Text>
    </View>
  );
}

const PADDING = 20;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: PADDING,
    marginBottom: 18,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accentText, fontSize: 14, fontWeight: '800' },
  titulo: { flex: 1, color: colors.text, fontSize: 26, fontWeight: '800' },

  secciones: { flexDirection: 'row', gap: 8, paddingHorizontal: PADDING, marginBottom: 12 },
  chipsScroll: { flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: PADDING },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSeccionActivo: { backgroundColor: colors.text, borderColor: colors.text },
  chipFiltroActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextSeccion: { color: colors.bg, fontWeight: '800' },
  chipTextFiltro: { color: colors.accentText, fontWeight: '800' },

  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    marginTop: 14,
    marginBottom: 6,
    minHeight: 24,
  },
  barraIzq: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  cantidad: { color: colors.textMuted, fontSize: 13 },
  ordenBoton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 12 },
  ordenText: { color: colors.text, fontSize: 13, fontWeight: '600' },

  lista: { paddingBottom: 24, flexGrow: 1 },

  vacio: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  vacioTitulo: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 14,
  },
  vacioTexto: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 6 },
  vacioBoton: { marginTop: 20, width: '100%', maxWidth: 320 },
  errorText: { color: colors.danger, fontSize: 15, textAlign: 'center', marginTop: 12 },
  retry: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.text,
  },
  retryText: { color: colors.text, fontWeight: '600' },

  sheetTitulo: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  sheetTituloSeparado: { marginTop: 18, marginBottom: 10 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  opcionText: { color: colors.text, fontSize: 15 },
  opcionActiva: { color: colors.accent, fontWeight: '700' },
});
