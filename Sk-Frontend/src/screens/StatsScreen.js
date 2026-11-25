import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStats } from '../api/stats';
import { colors, radius } from '../theme';

// Colores fijos para los chips de artistas (por posición, igual que el Figma)
const COLORES_ARTISTA = ['#E8B33C', '#4A6CF7', '#E05C3A', '#6B8E9F', '#3DAA72'];

// Genera iniciales de un nombre de artista (ej: "Soda Stereo" -> "SS")
const inicialesArtista = (nombre) => {
  const partes = (nombre || '?').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
};

export default function StatsScreen() {
  const insets = useSafeAreaInsets();

  // 'mes' o 'anio' — 'anio' es el default igual que el Figma
  const [periodo, setPeriodo] = useState('anio');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async (p, signal) => {
    try {
      const datos = await getStats(p, { signal });
      if (signal?.aborted) return;
      setStats(datos);
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err.message);
    }
  }, []);

  // Se recarga cada vez que cambia el período
  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    cargar(periodo, controller.signal).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [cargar, periodo]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargar(periodo);
    setRefreshing(false);
  };

  // Cambia el período y dispara la recarga
  const cambiarPeriodo = (nuevoPeriodo) => {
    if (nuevoPeriodo !== periodo) setPeriodo(nuevoPeriodo);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorTexto}>{error}</Text>
        <Pressable onPress={onRefresh} style={styles.reintentar}>
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      {/* ── ENCABEZADO CON TOGGLE ── */}
      <View style={styles.header}>
        <Text style={styles.titulo}>Tus stats</Text>
        <View style={styles.toggle}>
          <Pressable
            onPress={() => cambiarPeriodo('mes')}
            style={[styles.toggleBtn, periodo === 'mes' && styles.toggleBtnActivo]}
            accessibilityRole="button"
            accessibilityState={{ selected: periodo === 'mes' }}
          >
            <Text style={[styles.toggleTexto, periodo === 'mes' && styles.toggleTextoActivo]}>
              Este mes
            </Text>
          </Pressable>
          <Pressable
            onPress={() => cambiarPeriodo('anio')}
            style={[styles.toggleBtn, periodo === 'anio' && styles.toggleBtnActivo]}
            accessibilityRole="button"
            accessibilityState={{ selected: periodo === 'anio' }}
          >
            <Text style={[styles.toggleTexto, periodo === 'anio' && styles.toggleTextoActivo]}>
              Este año
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── BANNER SKWRAPPED ── */}
      <View style={styles.banner}>
        <Text style={styles.bannerTexto}>SKWRAPPED · {stats.anio}</Text>
        {/* Círculo decorativo igual que el Figma */}
        <View style={styles.bannerCirculo} />
      </View>

      {/* ── CARDS DE CALIFICACIÓN Y RESEÑAS ── */}
      <View style={styles.cardsRow}>
        {/* Calificación promedio */}
        <View style={[styles.card, styles.cardMitad]}>
          <Text style={styles.cardSubtitulo}>Calificación promedio</Text>
          {stats.calificacion.promedio !== null ? (
            <>
              <View style={styles.promedioRow}>
                <Text style={styles.promedioNumero}>{stats.calificacion.promedio}</Text>
                <Ionicons name="star" size={22} color={colors.accent} style={{ marginLeft: 4, marginTop: 2 }} />
              </View>
              <Text style={styles.cardDetalle}>
                sobre {stats.calificacion.cantidad}{' '}
                {stats.calificacion.cantidad === 1 ? 'canción' : 'canciones'}
              </Text>
            </>
          ) : (
            <Text style={styles.vacio}>Sin calificaciones</Text>
          )}
        </View>

        {/* Reseñas escritas */}
        <View style={[styles.card, styles.cardMitad]}>
          <Text style={styles.cardSubtitulo}>Reseñas escritas</Text>
          {stats.resenas.total > 0 ? (
            <>
              <Text style={styles.resenasNumero}>{stats.resenas.total}</Text>
              <Text style={styles.cardDetalle}>
                {stats.resenas.total === 1 ? 'reseña' : 'reseñas'}
              </Text>
            </>
          ) : (
            <Text style={styles.vacio}>Sin reseñas</Text>
          )}
        </View>
      </View>

      {/* ── TOP ARTISTAS ── */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Top artistas</Text>
        {stats.topArtistas.length === 0 ? (
          <Text style={styles.vacioCentrado}>
            Agregá canciones a tu biblioteca para ver tus artistas más escuchados.
          </Text>
        ) : (
          stats.topArtistas.map((artista, index) => (
            <FilaArtista
              key={artista.artista_nombre}
              posicion={index + 1}
              nombre={artista.artista_nombre}
              cantidad={artista.cantidad}
              color={COLORES_ARTISTA[index]}
            />
          ))
        )}
      </View>

      {/* ── GÉNEROS QUE PREDOMINAN ── */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Géneros que predominan</Text>
        {stats.generos.length === 0 ? (
          <Text style={styles.vacioCentrado}>
            Agregá canciones con género conocido para ver esta sección.
          </Text>
        ) : (
          stats.generos.map((g) => (
            <FilaGenero
              key={g.genero}
              genero={g.genero}
              porcentaje={g.porcentaje}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ── Componentes auxiliares ──────────────────────────────────────────────────

function FilaArtista({ posicion, nombre, cantidad, color }) {
  return (
    <View style={styles.filaArtista}>
      {/* Número de posición */}
      <Text style={styles.artistaPosicion}>{posicion}</Text>

      {/* Avatar con iniciales y color por posición */}
      <View style={[styles.artistaAvatar, { backgroundColor: color }]}>
        <Text style={styles.artistaAvatarTexto}>{inicialesArtista(nombre)}</Text>
      </View>

      {/* Nombre */}
      <Text style={styles.artistaNombre} numberOfLines={1}>
        {nombre}
      </Text>

      {/* Cantidad */}
      <Text style={styles.artistaCantidad}>
        {cantidad} {cantidad === 1 ? 'canción' : 'canciones'}
      </Text>
    </View>
  );
}

function FilaGenero({ genero, porcentaje }) {
  return (
    <View style={styles.filaGenero}>
      {/* Nombre + porcentaje */}
      <View style={styles.generoHeader}>
        <Text style={styles.generoNombre}>{genero}</Text>
        <Text style={styles.generoPorcentaje}>{porcentaje}%</Text>
      </View>

      {/* Barra de progreso */}
      <View style={styles.barraTrack}>
        <View style={[styles.barraFill, { width: `${porcentaje}%` }]} />
      </View>
    </View>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────

const PADDING = 20;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Encabezado con título y toggle
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    marginBottom: 16,
  },
  titulo: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },

  // Toggle "Este mes / Este año"
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  toggleBtnActivo: {
    backgroundColor: colors.accent,
  },
  toggleTexto: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextoActivo: {
    color: colors.accentText,
  },

  // Banner SKWrapped
  banner: {
    marginHorizontal: PADDING,
    marginBottom: 16,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerTexto: {
    color: colors.accentText,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    flex: 1,
  },
  // Círculo decorativo de fondo (ornamento visual igual al Figma)
  bannerCirculo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.15)',
    position: 'absolute',
    right: -10,
    top: -10,
  },

  // Par de cards (calificación + reseñas)
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: PADDING,
    gap: 12,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardMitad: { flex: 1 },
  cardSubtitulo: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDetalle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },

  // Calificación promedio
  promedioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promedioNumero: {
    color: colors.accent,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },

  // Reseñas
  resenasNumero: {
    color: colors.accent,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },

  // Estado vacío dentro de una card
  vacio: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },

  // Secciones (top artistas, géneros)
  seccion: {
    marginHorizontal: PADDING,
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  seccionTitulo: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  vacioCentrado: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Fila de artista
  filaArtista: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  artistaPosicion: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
    width: 16,
    textAlign: 'center',
  },
  artistaAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistaAvatarTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  artistaNombre: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  artistaCantidad: {
    color: colors.textMuted,
    fontSize: 13,
  },

  // Fila de género con barra
  filaGenero: {
    marginBottom: 14,
  },
  generoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  generoNombre: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  generoPorcentaje: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  barraTrack: {
    height: 8,
    backgroundColor: colors.track,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barraFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },

  // Error
  errorTexto: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: PADDING,
    marginBottom: 12,
  },
  reintentar: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.text,
  },
  reintentarTexto: { color: colors.text, fontWeight: '600' },
});
