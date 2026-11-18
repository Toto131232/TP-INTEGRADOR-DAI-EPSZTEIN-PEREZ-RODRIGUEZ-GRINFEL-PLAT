import { useCallback, useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Cover from '../components/Cover';
import { getDestacados, getResumen } from '../api/home';
import { colors, radius } from '../theme';

const saludo = (date = new Date()) => {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

const iniciales = (usuario) => {
  const base = (usuario?.nombre || usuario?.username || '?').trim();
  const partes = base.split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : base.slice(0, 2);
  return letras.toUpperCase();
};

const primerNombre = (usuario) =>
  (usuario?.nombre || usuario?.username || '').trim().split(/\s+/)[0];

export default function HomeScreen({ onNavigate }) {
  const insets = useSafeAreaInsets();
  const [resumen, setResumen] = useState(null);
  const [destacados, setDestacados] = useState([]);
  const [errorResumen, setErrorResumen] = useState(null);
  const [errorDestacados, setErrorDestacados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Las dos partes se cargan por separado: si falla una, la otra se muestra igual.
  const cargar = useCallback(async (signal) => {
    const [r, d] = await Promise.allSettled([
      getResumen({ signal }),
      getDestacados({ signal }),
    ]);
    if (signal?.aborted) return;

    if (r.status === 'fulfilled') {
      setResumen(r.value);
      setErrorResumen(null);
    } else {
      setErrorResumen(r.reason.message);
    }
    if (d.status === 'fulfilled') {
      setDestacados(d.value.data);
      setErrorDestacados(null);
    } else {
      setErrorDestacados(d.reason.message);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [cargar]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const usuario = resumen?.usuario;
  const stats = resumen?.stats;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
      }
    >
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.saludo}>{saludo()}</Text>
          <Text style={styles.hola} numberOfLines={1}>
            {usuario ? `Hola, ${primerNombre(usuario)}` : 'Hola'}
          </Text>
        </View>
        <Pressable onPress={() => onNavigate?.('perfil')} accessibilityLabel="Ir a mi perfil">
          {usuario?.avatarUrl ? (
            <Image source={{ uri: usuario.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{iniciales(usuario)}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {errorResumen ? (
        <ErrorBox mensaje={errorResumen} onRetry={onRefresh} />
      ) : (
        <>
          <ResumenCard stats={stats} onVerStats={() => onNavigate?.('stats')} />
          <Favoritos canciones={resumen?.favoritos ?? []} />
        </>
      )}

      {/* Destacado de hoy */}
      <Text style={styles.sectionTitle}>Destacado de hoy</Text>
      {errorDestacados ? (
        <ErrorBox mensaje={errorDestacados} onRetry={onRefresh} />
      ) : (
        <FlatList
          horizontal
          data={destacados}
          keyExtractor={(item) => String(item.deezerId)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.destacadosList}
          renderItem={({ item }) => (
            <View style={styles.destacado}>
              <Cover uri={item.album.portadaUrl} size={150} radius={radius.md} />
              <Text style={styles.destacadoTitulo} numberOfLines={1}>{item.titulo}</Text>
              <Text style={styles.destacadoArtista} numberOfLines={1}>{item.artista.nombre}</Text>
            </View>
          )}
        />
      )}
    </ScrollView>
  );
}

function ResumenCard({ stats, onVerStats }) {
  const total = stats?.enBiblioteca ?? 0;
  const escuchadas = stats?.escuchadas ?? 0;
  const progreso = total > 0 ? Math.min(escuchadas / total, 1) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Tu semana en SKMusic</Text>
        <Pressable onPress={onVerStats} hitSlop={8}>
          <Text style={styles.link}>Ver stats</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <Stat valor={total} label="en biblioteca" />
        <Stat valor={stats?.calificadas ?? 0} label="calificadas" />
        <Stat valor={stats?.resenas ?? 0} label="reseñas" />
      </View>

      <View style={styles.progresoHeader}>
        <Text style={styles.progresoLabel}>Progreso: biblioteca escuchada</Text>
        <Text style={styles.progresoValor}>{escuchadas} de {total}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progreso * 100}%` }]} />
      </View>
    </View>
  );
}

function Stat({ valor, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValor}>{valor}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Favoritos({ canciones }) {
  return (
    <>
      <Text style={styles.sectionTitle}>Tus favoritos</Text>
      {canciones.length === 0 ? (
        <Text style={styles.vacio}>
          Puntuá canciones con 4 o 5 estrellas y van a aparecer acá.
        </Text>
      ) : (
        <View style={styles.grid}>
          {canciones.map((c) => (
            <View key={c.deezerId} style={styles.favorito}>
              <Cover uri={c.album.portadaUrl} size={60} />
              <Text style={styles.favoritoTitulo} numberOfLines={2}>{c.titulo}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

function ErrorBox({ mensaje, onRetry }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{mensaje}</Text>
      <Pressable onPress={onRetry} style={styles.retry}>
        <Text style={styles.retryText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const PADDING = 20;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    marginBottom: 24,
  },
  headerText: { flex: 1, marginRight: 12 },
  saludo: { color: colors.textMuted, fontSize: 14, marginBottom: 4 },
  hola: { color: colors.text, fontSize: 28, fontWeight: '800' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accentText, fontSize: 16, fontWeight: '800' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: PADDING,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  link: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  statValor: { color: colors.accent, fontSize: 24, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  progresoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progresoLabel: { color: colors.textMuted, fontSize: 13 },
  progresoValor: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  track: {
    height: 8,
    backgroundColor: colors.track,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.full },

  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: PADDING,
    marginTop: 28,
    marginBottom: 14,
  },
  vacio: { color: colors.textMuted, fontSize: 14, paddingHorizontal: PADDING },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: PADDING,
  },
  favorito: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  favoritoTitulo: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
  },

  destacadosList: { paddingHorizontal: PADDING, gap: 14 },
  destacado: { width: 150 },
  destacadoTitulo: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 8 },
  destacadoArtista: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  errorBox: {
    marginHorizontal: PADDING,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  retry: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.text,
  },
  retryText: { color: colors.text, fontWeight: '600' },
});
