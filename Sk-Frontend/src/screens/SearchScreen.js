import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddToPlaylistSheet from '../components/AddToPlaylistSheet';
import SongItem from '../components/SongItem';
import { searchSongs } from '../api/songs';
import { colors } from '../theme';

const DEBOUNCE_MS = 400;
const PAGE_SIZE = 20;

export default function SearchScreen({ onOpenSong }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [total, setTotal] = useState(0);
  const [nextIndex, setNextIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  // Canción elegida con el "+" para agregar a una playlist (null = panel cerrado)
  const [paraAgregar, setParaAgregar] = useState(null);

  // Permite cancelar la búsqueda anterior si el usuario sigue escribiendo.
  const controllerRef = useRef(null);
  const term = query.trim();

  const runSearch = useCallback(async (q, index = 0) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (index === 0) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const res = await searchSongs(q, { index, limit: PAGE_SIZE, signal: controller.signal });
      setSongs((prev) => {
        if (index === 0) return res.data;
        // Deezer a veces repite canciones entre páginas: se filtran duplicados.
        const ids = new Set(prev.map((s) => s.deezerId));
        return [...prev, ...res.data.filter((s) => !ids.has(s.deezerId))];
      });
      setTotal(res.total);
      setNextIndex(res.nextIndex);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      if (controllerRef.current === controller) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Busca automáticamente cuando el usuario deja de escribir.
  useEffect(() => {
    if (!term) {
      controllerRef.current?.abort();
      setSongs([]);
      setTotal(0);
      setNextIndex(null);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      return undefined;
    }
    const timer = setTimeout(() => runSearch(term, 0), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term, runSearch]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const loadMore = () => {
    if (term && nextIndex !== null && !loading && !loadingMore && !error) {
      runSearch(term, nextIndex);
    }
  };

  const renderEmpty = () => {
    if (loading) return null;
    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => runSearch(term, 0)}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>
          {term ? `No hay resultados para "${term}"` : 'Buscá canciones, artistas o álbumes'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.header}>Buscar</Text>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="¿Qué querés escuchar?"
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => term && runSearch(term, 0)}
          maxLength={100}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && <ActivityIndicator style={styles.loader} color={colors.accent} />}

      {!loading && songs.length > 0 && (
        <Text style={styles.count}>{total} resultados</Text>
      )}

      <FlatList
        data={loading ? [] : songs}
        keyExtractor={(item) => String(item.deezerId)}
        renderItem={({ item }) => (
          <View style={styles.resultado}>
            <View style={styles.resultadoInfo}>
              <SongItem song={item} onPress={onOpenSong} />
            </View>
            <Pressable
              onPress={() => setParaAgregar(item)}
              hitSlop={8}
              style={styles.agregar}
              accessibilityRole="button"
              accessibilityLabel={`Agregar ${item.titulo} a una playlist`}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.loader} color={colors.accent} /> : null
        }
      />

      <AddToPlaylistSheet cancion={paraAgregar} onClose={() => setParaAgregar(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
  },
  input: { flex: 1, height: 44, fontSize: 16, color: '#000' },
  clear: { fontSize: 16, color: '#555', paddingLeft: 8 },
  loader: { marginVertical: 16 },
  count: { color: '#888', fontSize: 12, paddingHorizontal: 16, marginTop: 12 },
  listContent: { paddingVertical: 8, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  hint: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  errorText: { color: colors.danger, fontSize: 15, textAlign: 'center' },
  retry: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fff',
  },
  retryText: { color: '#fff', fontWeight: '600' },
  resultado: { flexDirection: 'row', alignItems: 'center' },
  resultadoInfo: { flex: 1 },
  agregar: { paddingLeft: 4, paddingRight: 16, paddingVertical: 8 },
});
