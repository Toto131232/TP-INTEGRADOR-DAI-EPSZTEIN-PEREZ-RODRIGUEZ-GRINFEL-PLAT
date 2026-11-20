import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import Cover from '../components/Cover';
import EditProfileScreen from './EditProfileScreen';
import { getPerfil } from '../api/profile';
import { useAuth } from '../auth/AuthContext';
import { colors, radius } from '../theme';

// Genera las iniciales del nombre/username para el avatar de texto
const iniciales = (nombre, username) => {
  const base = (nombre || username || '?').trim();
  const partes = base.split(/\s+/).filter(Boolean);
  const letras = partes.length > 1
    ? partes[0][0] + partes[partes.length - 1][0]
    : base.slice(0, 2);
  return letras.toUpperCase();
};

// Convierte una puntuación (1-5) en estrellas llenas y vacías
const renderEstrellas = (puntuacion) => {
  if (!puntuacion) return null;
  return (
    <View style={styles.estrellas}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= puntuacion ? 'star' : 'star-outline'}
          size={13}
          color={colors.accent}
        />
      ))}
    </View>
  );
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const [perfil, setPerfil] = useState(null);
  const [generos, setGeneros] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cuando es true se muestra la pantalla de edición en lugar del perfil
  const [editando, setEditando] = useState(false);

  const cargar = useCallback(async (signal) => {
    try {
      const datos = await getPerfil({ signal });
      if (signal?.aborted) return;
      setPerfil(datos);
      setGeneros(datos.generos);
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err.message);
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

  // Cuando el usuario guarda cambios en EditProfileScreen,
  // actualizamos el estado local sin volver a llamar a la API
  const onGuardado = (usuarioActualizado, generosActualizados) => {
    setPerfil((prev) => ({ ...prev, usuario: usuarioActualizado }));
    setGeneros(generosActualizados);
    setEditando(false);
  };

  // Muestra la pantalla de edición si está en modo edición
  if (editando && perfil) {
    return (
      <EditProfileScreen
        perfil={perfil.usuario}
        generosPrevios={generos}
        onGuardado={onGuardado}
        onVolver={() => setEditando(false)}
      />
    );
  }

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

  const { usuario, stats, favoritos, resenas } = perfil;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      {/* ── CABECERA ── */}
      <View style={styles.cabecera}>
        {/* Avatar: foto si tiene URL, sino iniciales */}
        {usuario.avatar_url ? (
          <Image source={{ uri: usuario.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>
              {iniciales(usuario.nombre, usuario.username)}
            </Text>
          </View>
        )}

        <View style={styles.cabeceraDatos}>
          <Text style={styles.etiquetaPerfil}>PERFIL</Text>
          <Text style={styles.nombre} numberOfLines={1}>
            {usuario.nombre || usuario.username}
          </Text>
          <Text style={styles.username}>@{usuario.username}</Text>
        </View>
      </View>

      {/* Bio */}
      {usuario.bio ? (
        <Text style={styles.bio}>{usuario.bio}</Text>
      ) : null}

      {/* Stats en línea */}
      <View style={styles.statsRow}>
        <Text style={styles.stat}>
          <Text style={styles.statNumero}>{stats.en_biblioteca}</Text>
          <Text style={styles.statLabel}> en biblioteca</Text>
        </Text>
        <Text style={styles.statSep}>·</Text>
        <Text style={styles.stat}>
          <Text style={styles.statNumero}>{stats.favoritos}</Text>
          <Text style={styles.statLabel}> favoritos</Text>
        </Text>
        <Text style={styles.statSep}>·</Text>
        <Text style={styles.stat}>
          <Text style={styles.statNumero}>{stats.resenas}</Text>
          <Text style={styles.statLabel}> reseñas</Text>
        </Text>
      </View>

      {/* Botón editar perfil */}
      <Pressable
        onPress={() => setEditando(true)}
        style={({ pressed }) => [styles.botonEditar, pressed && styles.botonEditarPresionado]}
        accessibilityRole="button"
        accessibilityLabel="Editar perfil"
      >
        <Text style={styles.botonEditarTexto}>Editar perfil</Text>
      </Pressable>

      {/* ── GÉNEROS ── */}
      {generos.length > 0 ? (
        <>
          <Text style={styles.seccionTitulo}>Géneros que más te gustan</Text>
          <View style={styles.chipsRow}>
            {generos.map((g) => (
              <View key={g} style={styles.chip}>
                <Text style={styles.chipTexto}>{g}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* ── FAVORITOS ── */}
      {favoritos.length > 0 ? (
        <>
          <Text style={styles.seccionTitulo}>Favoritos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favoritosLista}
          >
            {favoritos.map((c) => (
              <View key={c.deezer_id} style={styles.favoritoItem}>
                <Cover uri={c.portada_url} size={64} radius={radius.md} />
                <Text style={styles.favoritoTexto} numberOfLines={2}>
                  {iniciales(c.artista_nombre, c.artista_nombre)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* ── MIS RESEÑAS ── */}
      {resenas.length > 0 ? (
        <>
          <Text style={styles.seccionTitulo}>Mis reseñas</Text>
          {resenas.map((r) => (
            <View key={r.id_resena} style={styles.resenaCard}>
              <View style={styles.resenaHeader}>
                <Text style={styles.resenaTitulo} numberOfLines={1}>
                  {r.titulo}
                </Text>
                {renderEstrellas(r.puntuacion)}
              </View>
              <Text style={styles.resenaTexto} numberOfLines={3}>
                {r.texto}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      {/* Botón cerrar sesión al pie */}
      <Pressable
        onPress={signOut}
        style={({ pressed }) => [styles.botonCerrar, pressed && styles.botonCerrarPresionado]}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
      >
        <Ionicons name="log-out-outline" size={18} color={colors.dangerText} />
        <Text style={styles.botonCerrarTexto}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const PADDING = 20;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Cabecera del perfil
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    marginBottom: 14,
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    color: colors.accentText,
    fontSize: 28,
    fontWeight: '800',
  },
  cabeceraDatos: { flex: 1 },
  etiquetaPerfil: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  nombre: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  username: {
    color: colors.textMuted,
    fontSize: 14,
  },

  // Bio
  bio: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: PADDING,
    marginBottom: 14,
  },

  // Stats en una línea
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    marginBottom: 18,
    flexWrap: 'wrap',
    gap: 4,
  },
  stat: { fontSize: 14 },
  statNumero: { color: colors.text, fontWeight: '700' },
  statLabel: { color: colors.textMuted },
  statSep: { color: colors.textMuted, marginHorizontal: 6, fontSize: 14 },

  // Botón editar perfil (outline)
  botonEditar: {
    marginHorizontal: PADDING,
    marginBottom: 28,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.text,
    alignItems: 'center',
  },
  botonEditarPresionado: { opacity: 0.7 },
  botonEditarTexto: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  // Título de sección
  seccionTitulo: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: PADDING,
    marginBottom: 14,
  },

  // Chips de géneros
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: PADDING,
    marginBottom: 28,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipTexto: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },

  // Fila horizontal de favoritos
  favoritosLista: {
    paddingHorizontal: PADDING,
    gap: 12,
    marginBottom: 28,
  },
  favoritoItem: { alignItems: 'center', width: 64 },
  favoritoTexto: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },

  // Cards de reseñas
  resenaCard: {
    marginHorizontal: PADDING,
    marginBottom: 10,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resenaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resenaTitulo: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  estrellas: { flexDirection: 'row', gap: 2 },
  resenaTexto: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },

  // Botón cerrar sesión
  botonCerrar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: PADDING,
    marginTop: 32,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  botonCerrarPresionado: { opacity: 0.7 },
  botonCerrarTexto: {
    color: colors.dangerText,
    fontSize: 15,
    fontWeight: '700',
  },

  // Estados de error
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
