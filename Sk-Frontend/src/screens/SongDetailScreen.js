import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSong } from '../api/songs';
import {
  addToLibrary,
  getLibraryItem,
  removeFromLibrary,
  setEstado,
  setLike,
  setRating,
} from '../api/library';
import { createReview, deleteReview, listReviews, updateReview } from '../api/reviews';
import { useAuth } from '../auth/AuthContext';
import { colors, radius } from '../theme';

const ESTADOS = [
  { key: 'quiero_escuchar', label: 'Quiero escuchar' },
  { key: 'escuchando', label: 'Escuchando' },
  { key: 'escuchado', label: 'Escuchado' },
];
const CALIFICACION_LABEL = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente'];
const MAX_RESENA = 1000;
const HEADER_BG = '#1C3470';

const formatDuration = (seg) => {
  if (!seg) return null;
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
};

const anio = (fecha) => (fecha ? Number(fecha.slice(0, 4)) : null);

// 1987 -> "Años 80", 2016 -> "Años 2010"
const decada = (year) => {
  if (!year) return null;
  const d = Math.floor(year / 10) * 10;
  return d < 2000 ? `Años ${d % 100}` : `Años ${d}`;
};

const iniciales = (texto = '') =>
  texto
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?';

const formatFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

// song: la canción como viene del buscador / la Home (se muestra mientras carga el detalle)
export default function SongDetailScreen({ song: initialSong, onBack }) {
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const deezerId = initialSong.deezerId;

  const [song, setSong] = useState(initialSong);
  const [item, setItem] = useState(null); // fila de mi biblioteca (null = no está)
  const [resenas, setResenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(null); // acción en curso: 'like' | 'library' | 'estado' | 'rating'
  const [actionError, setActionError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Botón "atrás" de Android
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const cargarResenas = useCallback(async (signal) => {
    const { resenas: lista } = await listReviews(deezerId, { signal });
    setResenas(lista);
  }, [deezerId]);

  const cargar = useCallback(async (signal) => {
    setLoadError(null);
    const [s, lib, rev] = await Promise.allSettled([
      getSong(deezerId, { signal }),
      getLibraryItem(deezerId, { signal }),
      cargarResenas(signal),
    ]);
    if (signal?.aborted) return;
    if (s.status === 'fulfilled') setSong(s.value.cancion);
    if (lib.status === 'fulfilled') setItem(lib.value);
    const fallo = [s, lib, rev].find((r) => r.status === 'rejected');
    if (fallo) setLoadError(fallo.reason.message);
  }, [deezerId, cargarResenas]);

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [cargar]);

  // Corre una acción sobre la biblioteca evitando dobles toques
  const run = async (nombre, fn) => {
    if (busy) return;
    setBusy(nombre);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const toggleLike = () => run('like', async () => {
    setItem(await setLike(deezerId, !item?.me_gusta));
  });

  const toggleLibrary = () => run('library', async () => {
    if (item) {
      await removeFromLibrary(deezerId);
      setItem(null);
    } else {
      setItem(await addToLibrary(deezerId));
    }
  });

  const elegirEstado = (estado) => run('estado', async () => {
    if (!item) setItem(await addToLibrary(deezerId, estado));
    else if (item.estado !== estado) setItem(await setEstado(deezerId, estado));
  });

  // Para calificar tiene que estar en la biblioteca: si no está, se agrega como escuchada
  const calificar = (puntuacion) => run('rating', async () => {
    if (!item) await addToLibrary(deezerId, 'escuchado');
    setItem(await setRating(deezerId, puntuacion));
  });

  const abrirEnDeezer = () => {
    setMenuOpen(false);
    Linking.openURL(song.link || `https://www.deezer.com/track/${deezerId}`);
  };

  const miId = usuario?.id_usuario;
  const miResena = resenas.find((r) => r.id_usuario === miId) ?? null;
  const otras = resenas.filter((r) => r.id_usuario !== miId);

  const year = anio(song.fechaLanzamiento);
  const meta = [song.album?.titulo, year, formatDuration(song.duracionSeg)].filter(Boolean).join(' · ');
  const tags = [...(song.generos ?? []).slice(0, 2), decada(year)].filter(Boolean);
  const portada = song.album?.portadaGrandeUrl || song.album?.portadaUrl;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera azul */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.topBar}>
            <IconButton icon="chevron-back" label="Volver" onPress={onBack} />
            <IconButton icon="ellipsis-horizontal" label="Más opciones" onPress={() => setMenuOpen((v) => !v)} />
          </View>

          <View style={styles.coverWrap}>
            {portada ? (
              <Image source={{ uri: portada }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Text style={styles.coverInitials}>{iniciales(song.artista?.nombre)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>
            {song.titulo}
            {song.explicito ? <Text style={styles.explicit}>  E</Text> : null}
          </Text>
          <Text style={styles.artist}>{song.artista?.nombre}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}

          {tags.length > 0 && (
            <View style={styles.tags}>
              {tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
        ) : (
          <View style={styles.body}>
            {loadError ? (
              <View style={styles.errorRow}>
                <Text style={styles.errorText}>{loadError}</Text>
                <Pressable onPress={() => cargar()} hitSlop={8}>
                  <Text style={styles.link}>Reintentar</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Me gusta / biblioteca / play */}
            <View style={styles.actions}>
              <Pressable
                onPress={toggleLike}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={item?.me_gusta ? 'Quitar me gusta' : 'Me gusta'}
                accessibilityState={{ selected: !!item?.me_gusta, busy: busy === 'like' }}
              >
                <Ionicons
                  name={item?.me_gusta ? 'heart' : 'heart-outline'}
                  size={28}
                  color={item?.me_gusta ? colors.accent : colors.text}
                />
              </Pressable>

              <Pressable
                onPress={toggleLibrary}
                style={styles.libraryBtn}
                accessibilityRole="button"
                accessibilityLabel={item ? 'Quitar de tu biblioteca' : 'Agregar a tu biblioteca'}
              >
                <View style={[styles.libraryIcon, item && styles.libraryIconActive]}>
                  {busy === 'library' ? (
                    <ActivityIndicator size="small" color={item ? colors.accentText : colors.text} />
                  ) : (
                    <Ionicons
                      name={item ? 'checkmark' : 'add'}
                      size={22}
                      color={item ? colors.accentText : colors.text}
                    />
                  )}
                </View>
                <Text style={styles.libraryText}>{item ? 'En tu biblioteca' : 'Agregar a biblioteca'}</Text>
              </Pressable>

              <View style={{ flex: 1 }} />

              <Pressable
                onPress={abrirEnDeezer}
                style={({ pressed }) => [styles.play, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
                accessibilityLabel="Escuchar en Deezer"
              >
                <Ionicons name="play" size={24} color={colors.accentText} style={{ marginLeft: 3 }} />
              </Pressable>
            </View>

            {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

            {/* Estado */}
            <Text style={styles.sectionTitle}>Estado</Text>
            <View style={styles.chips}>
              {ESTADOS.map((e) => {
                const activo = item?.estado === e.key;
                return (
                  <Pressable
                    key={e.key}
                    onPress={() => elegirEstado(e.key)}
                    style={[styles.chip, activo && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo }}
                  >
                    <Text style={[styles.chipText, activo && styles.chipTextActive]}>{e.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Calificación */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Tu calificación</Text>
                {item?.puntuacion ? (
                  <Text style={styles.ratingValue}>
                    {item.puntuacion}/5 · {CALIFICACION_LABEL[item.puntuacion]}
                  </Text>
                ) : (
                  <Text style={styles.ratingEmpty}>Sin calificar</Text>
                )}
              </View>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => calificar(n)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`${n} de 5`}
                  >
                    <Ionicons
                      name={n <= (item?.puntuacion ?? 0) ? 'star' : 'star-outline'}
                      size={34}
                      color={n <= (item?.puntuacion ?? 0) ? colors.accent : colors.track}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Mi reseña */}
            <MiResena
              deezerId={deezerId}
              resena={miResena}
              onChange={() => cargarResenas().catch((err) => setActionError(err.message))}
            />

            {/* Reseñas de otros */}
            <Text style={styles.sectionTitle}>
              Reseñas{otras.length > 0 ? ` (${otras.length})` : ''}
            </Text>
            {otras.length === 0 ? (
              <Text style={styles.empty}>Todavía nadie más reseñó esta canción.</Text>
            ) : (
              otras.map((r) => <ResenaItem key={r.id_resena} resena={r} />)
            )}
          </View>
        )}
      </ScrollView>

      {/* Menú de "..." */}
      {menuOpen && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menu, { top: insets.top + 60 }]}>
            <MenuItem icon="open-outline" label="Abrir en Deezer" onPress={abrirEnDeezer} />
            {item ? (
              <MenuItem
                icon="trash-outline"
                label="Quitar de mi biblioteca"
                danger
                onPress={() => {
                  setMenuOpen(false);
                  toggleLibrary();
                }}
              />
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

// Reseña del usuario logueado: escribir, editar o borrar
function MiResena({ deezerId, resena, onChange }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const mostrarForm = !resena || editando;

  const empezarEdicion = () => {
    setTexto(resena.texto);
    setError(null);
    setEditando(true);
  };

  const guardar = async () => {
    const limpio = texto.trim();
    if (!limpio) {
      setError('Escribí algo antes de publicar');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (resena) await updateReview(resena.id_resena, limpio);
      else await createReview(deezerId, limpio);
      setEditando(false);
      setTexto('');
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const borrar = async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteReview(resena.id_resena);
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Tu reseña</Text>

      {mostrarForm ? (
        <>
          <TextInput
            style={styles.reviewInput}
            value={texto}
            onChangeText={(t) => {
              setTexto(t);
              if (error) setError(null);
            }}
            placeholder="¿Qué te pareció esta canción?"
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.accent}
            multiline
            maxLength={MAX_RESENA}
            textAlignVertical="top"
          />
          <View style={styles.reviewFooter}>
            <Text style={styles.counter}>{texto.length}/{MAX_RESENA}</Text>
            <View style={styles.reviewButtons}>
              {editando && (
                <Pressable onPress={() => setEditando(false)} style={styles.ghostBtn} disabled={saving}>
                  <Text style={styles.ghostBtnText}>Cancelar</Text>
                </Pressable>
              )}
              <Pressable
                onPress={guardar}
                disabled={saving}
                style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.85 }]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.accentText} />
                ) : (
                  <Text style={styles.smallBtnText}>{resena ? 'Guardar' : 'Publicar'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.reviewText}>{resena.texto}</Text>
          <Text style={styles.reviewDate}>
            {formatFecha(resena.editada_en || resena.creada_en)}
            {resena.editada_en ? ' · editada' : ''}
          </Text>
          <View style={[styles.reviewButtons, { marginTop: 12 }]}>
            <Pressable onPress={borrar} style={styles.ghostBtn} disabled={saving}>
              <Text style={[styles.ghostBtnText, { color: colors.dangerText }]}>Borrar</Text>
            </Pressable>
            <Pressable onPress={empezarEdicion} style={styles.ghostBtn} disabled={saving}>
              <Text style={styles.ghostBtnText}>Editar</Text>
            </Pressable>
          </View>
        </>
      )}
      {error ? <Text style={styles.actionError}>{error}</Text> : null}
    </View>
  );
}

function ResenaItem({ resena }) {
  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewAvatar}>
        <Text style={styles.reviewAvatarText}>{resena.username.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.reviewItemHeader}>
          <Text style={styles.reviewUser}>@{resena.username}</Text>
          <Text style={[styles.reviewDate, { marginTop: 0 }]}>{formatFecha(resena.creada_en)}</Text>
        </View>
        <Text style={styles.reviewText}>{resena.texto}</Text>
      </View>
    </View>
  );
}

function IconButton({ icon, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

function MenuItem({ icon, label, onPress, danger }) {
  const color = danger ? colors.dangerText : colors.text;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.menuText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const PADDING = 20;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: PADDING,
    paddingBottom: 22,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: 'rgba(11, 16, 34, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverWrap: {
    alignSelf: 'center',
    marginBottom: 24,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  cover: { width: 180, height: 180, borderRadius: radius.md },
  coverPlaceholder: {
    backgroundColor: '#3B6FE0',
    justifyContent: 'flex-end',
    padding: 12,
  },
  coverInitials: { color: colors.text, fontSize: 40, fontWeight: '800' },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  explicit: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  artist: { color: '#D3DBF2', fontSize: 15, fontWeight: '600', marginTop: 4 },
  meta: { color: '#A9B4D6', fontSize: 12, marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag: {
    backgroundColor: 'rgba(11, 16, 34, 0.6)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: { color: colors.text, fontSize: 12, fontWeight: '600' },

  body: { paddingHorizontal: PADDING, paddingTop: 18 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  errorText: { flex: 1, color: colors.dangerText, fontSize: 13 },
  link: { color: colors.accent, fontWeight: '700' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  libraryBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  libraryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryIconActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  libraryText: { color: colors.textMuted, fontSize: 13 },
  play: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionError: { color: colors.dangerText, fontSize: 13, marginTop: 10 },

  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.accentText },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 24,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  ratingValue: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  ratingEmpty: { color: colors.textMuted, fontSize: 13 },
  stars: { flexDirection: 'row', gap: 8, marginTop: 14 },

  reviewInput: {
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg,
    color: colors.text,
    fontSize: 14,
    padding: 12,
    outlineStyle: 'none',
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  counter: { color: colors.textMuted, fontSize: 12 },
  reviewButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  smallBtn: {
    minWidth: 96,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { color: colors.accentText, fontWeight: '700', fontSize: 14 },
  ghostBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  reviewText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  reviewDate: { color: colors.textMuted, fontSize: 12, marginTop: 6 },

  empty: { color: colors.textMuted, fontSize: 14 },
  reviewItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  reviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  reviewUser: { color: colors.text, fontSize: 13, fontWeight: '700' },

  menu: {
    position: 'absolute',
    right: PADDING,
    minWidth: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  menuText: { fontSize: 14, fontWeight: '600' },
});
