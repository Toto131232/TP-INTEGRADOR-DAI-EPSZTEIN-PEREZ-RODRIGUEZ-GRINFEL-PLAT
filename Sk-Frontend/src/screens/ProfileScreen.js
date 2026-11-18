import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Cover from '../components/Cover';
import { getPerfil, updatePerfil } from '../api/profile';
import { colors, radius } from '../theme';

const PADDING = 20;

// Genera las iniciales del nombre o username del usuario.
const iniciales = (usuario) => {
  const base = (usuario?.nombre || usuario?.username || '?').trim();
  const partes = base.split(/\s+/).filter(Boolean);
  const letras =
    partes.length > 1
      ? partes[0][0] + partes[partes.length - 1][0]
      : base.slice(0, 2);
  return letras.toUpperCase();
};

// ─── Pantalla principal ────────────────────────────────────────────────────────

export default function ProfileScreen({ onNavigate }) {
  const insets = useSafeAreaInsets();
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editVisible, setEditVisible] = useState(false);

  const cargar = useCallback(async (signal) => {
    setError(null);
    try {
      const data = await getPerfil({ signal });
      if (!signal?.aborted) setPerfil(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
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

  const onGuardar = (perfilActualizado) => {
    setPerfil(perfilActualizado);
    setEditVisible(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => { setLoading(true); cargar().finally(() => setLoading(false)); }} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const { usuario, contadores, generos, favoritos, resenas } = perfil ?? {};

  return (
    <>
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
        {/* Encabezado */}
        <CabeceraPeril
          usuario={usuario}
          contadores={contadores}
          onEditarPerfil={() => setEditVisible(true)}
        />

        {/* Géneros favoritos */}
        <SeccionGeneros generos={generos ?? []} />

        {/* Favoritos */}
        <SeccionFavoritos
          favoritos={favoritos ?? []}
          onVerTodos={() => onNavigate?.('biblioteca')}
        />

        {/* Mis reseñas */}
        <SeccionResenas resenas={resenas ?? []} />
      </ScrollView>

      {/* Modal de edición */}
      {perfil && (
        <EditarPerfilModal
          visible={editVisible}
          usuario={usuario}
          generos={generos ?? []}
          onClose={() => setEditVisible(false)}
          onGuardar={onGuardar}
        />
      )}
    </>
  );
}

// ─── Cabecera del perfil ───────────────────────────────────────────────────────

function CabeceraPeril({ usuario, contadores, onEditarPerfil }) {
  return (
    <View style={styles.cabecera}>
      {/* Avatar circular */}
      <View style={styles.avatarWrapper}>
        <Text style={styles.avatarText}>{iniciales(usuario)}</Text>
      </View>

      {/* Etiqueta PERFIL + nombre + username */}
      <Text style={styles.etiquetaPerfil}>PERFIL</Text>
      <Text style={styles.nombreCompleto}>{usuario?.nombre || usuario?.username}</Text>
      <Text style={styles.username}>@{usuario?.username}</Text>

      {/* Bio */}
      {usuario?.bio ? (
        <Text style={styles.bio}>{usuario.bio}</Text>
      ) : null}

      {/* Contadores */}
      <View style={styles.contadoresRow}>
        <ContadorItem valor={contadores?.enBiblioteca ?? 0} label="en biblioteca" />
        <ContadorItem valor={contadores?.favoritos ?? 0} label="favoritos" />
        <ContadorItem valor={contadores?.resenas ?? 0} label="reseñas" />
      </View>

      {/* Botón editar */}
      <Pressable style={styles.editarBtn} onPress={onEditarPerfil}>
        <Text style={styles.editarBtnText}>Editar perfil</Text>
      </Pressable>
    </View>
  );
}

function ContadorItem({ valor, label }) {
  return (
    <View style={styles.contador}>
      <Text style={styles.contadorValor}>{valor}</Text>
      <Text style={styles.contadorLabel}>{label}</Text>
    </View>
  );
}

// ─── Géneros ──────────────────────────────────────────────────────────────────

function SeccionGeneros({ generos }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>Géneros que más te gustan</Text>
      {generos.length === 0 ? (
        <Text style={styles.vacio}>Todavía no elegiste géneros favoritos.</Text>
      ) : (
        <View style={styles.chipsRow}>
          {generos.map((g) => (
            <View key={g} style={styles.chip}>
              <Text style={styles.chipText}>{g}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Favoritos ────────────────────────────────────────────────────────────────

function SeccionFavoritos({ favoritos, onVerTodos }) {
  return (
    <View style={styles.seccion}>
      <View style={styles.seccionHeader}>
        <Text style={styles.seccionTituloInline}>Favoritos</Text>
        {favoritos.length > 0 && (
          <Pressable onPress={onVerTodos} hitSlop={8}>
            <Text style={styles.link}>Ver todos</Text>
          </Pressable>
        )}
      </View>
      {favoritos.length === 0 ? (
        <Text style={styles.vacio}>
          Puntuá canciones con 4 o 5 estrellas para verlas acá.
        </Text>
      ) : (
        <View style={styles.favoritosGrid}>
          {favoritos.map((c) => (
            <View key={c.deezerId} style={styles.favoritoItem}>
              <Cover uri={c.album.portadaUrl} size={56} radius={radius.sm} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Reseñas ──────────────────────────────────────────────────────────────────

function SeccionResenas({ resenas }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>Mis reseñas</Text>
      {resenas.length === 0 ? (
        <Text style={styles.vacio}>Todavía no escribiste ninguna reseña.</Text>
      ) : (
        resenas.map((r) => <TarjetaResena key={r.idResena} resena={r} />)
      )}
    </View>
  );
}

function TarjetaResena({ resena }) {
  return (
    <View style={styles.tarjetaResena}>
      <View style={styles.resenaHeader}>
        <Cover uri={resena.cancion.portadaUrl} size={44} radius={radius.sm} />
        <View style={styles.resenaInfo}>
          <Text style={styles.resenaCancion} numberOfLines={1}>
            {resena.cancion.titulo}
          </Text>
          <Text style={styles.resenaArtista} numberOfLines={1}>
            {resena.cancion.artistaNombre}
          </Text>
          {resena.puntuacion != null && (
            <Estrellas puntuacion={resena.puntuacion} />
          )}
        </View>
      </View>
      <Text style={styles.resenaTexto}>{resena.texto}</Text>
    </View>
  );
}

function Estrellas({ puntuacion }) {
  return (
    <View style={styles.estrellasRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= puntuacion ? 'star' : 'star-outline'}
          size={13}
          color={colors.accent}
        />
      ))}
    </View>
  );
}

// ─── Modal editar perfil ───────────────────────────────────────────────────────

function EditarPerfilModal({ visible, usuario, generos, onClose, onGuardar }) {
  const insets = useSafeAreaInsets();
  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [username, setUsername] = useState(usuario?.username || '');
  const [bio, setBio] = useState(usuario?.bio || '');
  const [generosInput, setGenerosInput] = useState(generos.join(', '));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // Reinicia el form cada vez que se abre el modal.
  useEffect(() => {
    if (visible) {
      setNombre(usuario?.nombre || '');
      setUsername(usuario?.username || '');
      setBio(usuario?.bio || '');
      setGenerosInput(generos.join(', '));
      setError(null);
    }
  }, [visible, usuario, generos]);

  const handleGuardar = async () => {
    setError(null);

    if (!username.trim()) {
      setError('El nombre de usuario es obligatorio');
      return;
    }

    // Parsear la cadena de géneros separados por coma.
    const generosArray = generosInput
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);

    setGuardando(true);
    try {
      const perfilActualizado = await updatePerfil({
        nombre: nombre.trim() || null,
        username: username.trim(),
        bio: bio.trim() || null,
        generos: generosArray,
      });
      onGuardar(perfilActualizado);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        {/* Header del modal */}
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.modalCancelar}>Cancelar</Text>
          </Pressable>
          <Text style={styles.modalTitulo}>Editar perfil</Text>
          <Pressable onPress={handleGuardar} disabled={guardando} hitSlop={10}>
            {guardando ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.modalGuardar}>Guardar</Text>
            )}
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScroll}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Campo
            label="Nombre completo"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Tu nombre completo"
            maxLength={100}
          />
          <Campo
            label="Nombre de usuario *"
            value={username}
            onChangeText={setUsername}
            placeholder="sin espacios (letras, números, _ o .)"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={50}
          />
          <Campo
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Contá algo sobre vos..."
            multiline
            maxLength={300}
            style={styles.bioInput}
          />
          <Campo
            label="Géneros favoritos"
            value={generosInput}
            onChangeText={setGenerosInput}
            placeholder="Ej: Rock, Pop, Jazz (separados por coma)"
            maxLength={500}
          />
          <Text style={styles.campoAyuda}>
            Separá los géneros con comas. Ej: Rock nacional, Pop 80s, Synthpop
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Campo({ label, style, ...inputProps }) {
  return (
    <View style={styles.campoWrapper}>
      <Text style={styles.campoLabel}>{label}</Text>
      <TextInput
        style={[styles.campoInput, style]}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        {...inputProps}
      />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Cabecera
  cabecera: {
    alignItems: 'center',
    paddingHorizontal: PADDING,
    marginBottom: 8,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: colors.accentText, fontSize: 28, fontWeight: '800' },
  etiquetaPerfil: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  nombreCompleto: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  username: { color: colors.textMuted, fontSize: 15, marginTop: 2, marginBottom: 10 },
  bio: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  contadoresRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  contador: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  contadorValor: { color: colors.accent, fontSize: 20, fontWeight: '800' },
  contadorLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2, textAlign: 'center' },

  editarBtn: {
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: radius.full,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  editarBtnText: { color: colors.text, fontSize: 14, fontWeight: '600' },

  // Secciones
  seccion: { marginTop: 28, paddingHorizontal: PADDING },
  seccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  seccionTitulo: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },
  // Versión sin marginBottom para usar dentro del seccionHeader (que ya tiene el suyo)
  seccionTituloInline: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  link: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  vacio: { color: colors.textMuted, fontSize: 14 },

  // Chips de géneros
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },

  // Grid de favoritos
  favoritosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  favoritoItem: { borderRadius: radius.sm, overflow: 'hidden' },

  // Tarjeta de reseña
  tarjetaResena: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  resenaHeader: { flexDirection: 'row', marginBottom: 10 },
  resenaInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  resenaCancion: { color: colors.text, fontSize: 15, fontWeight: '700' },
  resenaArtista: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  estrellasRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
  resenaTexto: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },

  // Errores y retry
  errorBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.text,
  },
  retryText: { color: colors.text, fontWeight: '600' },

  // Modal de edición
  modalContainer: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    marginBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 14,
  },
  modalTitulo: { color: colors.text, fontSize: 17, fontWeight: '700' },
  modalCancelar: { color: colors.textMuted, fontSize: 15 },
  modalGuardar: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  modalScroll: { paddingHorizontal: PADDING },

  // Campos del formulario
  campoWrapper: { marginBottom: 20 },
  campoLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  campoInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  campoAyuda: { color: colors.textMuted, fontSize: 12, marginTop: -12, marginBottom: 8 },
});
