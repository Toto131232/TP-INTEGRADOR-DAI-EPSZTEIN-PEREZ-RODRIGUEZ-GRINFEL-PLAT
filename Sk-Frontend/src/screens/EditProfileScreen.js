import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updatePerfil } from '../api/profile';
import { colors, radius } from '../theme';

// Géneros predefinidos que el usuario puede elegir con un toque
const GENEROS_SUGERIDOS = [
  'Pop', 'Rock', 'Hip-Hop', 'Trap', 'Reggaeton', 'Electrónica',
  'Jazz', 'Blues', 'Clásica', 'Indie', 'Metal', 'Folk',
  'R&B', 'Soul', 'Funk', 'Synthpop', 'Rock nacional', 'Pop 80s',
];

export default function EditProfileScreen({ perfil, generosPrevios, onGuardado, onVolver }) {
  const insets = useSafeAreaInsets();
  const bioRef = useRef(null);

  // Inicializa los campos con los valores actuales del perfil
  const [nombre, setNombre] = useState(perfil.nombre || '');
  const [bio, setBio] = useState(perfil.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(perfil.avatar_url || '');
  const [generosSeleccionados, setGenerosSeleccionados] = useState(new Set(generosPrevios));

  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Alterna un género: lo agrega si no estaba, lo quita si ya estaba
  const toggleGenero = (genero) => {
    setGenerosSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(genero)) {
        nuevo.delete(genero);
      } else {
        nuevo.add(genero);
      }
      return nuevo;
    });
  };

  const guardar = async () => {
    if (guardando) return;

    if (!nombre.trim()) {
      setError('El nombre no puede estar vacío');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const { usuario } = await updatePerfil({
        nombre: nombre.trim(),
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        generos: Array.from(generosSeleccionados),
      });
      // Avisa a ProfileScreen para que actualice los datos sin volver a pedirlos a la API
      onGuardado(usuario, Array.from(generosSeleccionados));
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Barra superior */}
      <View style={styles.topBar}>
        <Pressable onPress={onVolver} style={styles.topBarBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Editar perfil</Text>
        <Pressable onPress={guardar} style={styles.topBarBtn} hitSlop={8} disabled={guardando} accessibilityRole="button" accessibilityLabel="Guardar">
          {guardando
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Text style={styles.guardarText}>Guardar</Text>}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sección datos personales */}
        <Text style={styles.seccion}>Datos personales</Text>

        <View style={styles.campo}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={(t) => { setNombre(t); setError(null); }}
            placeholder="Tu nombre"
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.accent}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => bioRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            ref={bioRef}
            style={[styles.input, styles.inputMultiline]}
            value={bio}
            onChangeText={(t) => { setBio(t); setError(null); }}
            placeholder="Contá algo sobre vos..."
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.accent}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.contador}>{bio.length}/300</Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>URL de avatar</Text>
          <TextInput
            style={styles.input}
            value={avatarUrl}
            onChangeText={(t) => { setAvatarUrl(t); setError(null); }}
            placeholder="https://..."
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.accent}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.ayuda}>Dejalo vacío para usar tus iniciales como avatar</Text>
        </View>

        {/* Sección géneros */}
        <Text style={[styles.seccion, { marginTop: 28 }]}>Géneros que te gustan</Text>
        <Text style={styles.ayuda}>Tocá para seleccionar o quitar</Text>

        <View style={styles.generosGrid}>
          {GENEROS_SUGERIDOS.map((g) => {
            const seleccionado = generosSeleccionados.has(g);
            return (
              <Pressable
                key={g}
                onPress={() => toggleGenero(g)}
                style={[styles.generoChip, seleccionado && styles.generoChipActivo]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: seleccionado }}
                accessibilityLabel={g}
              >
                <Text style={[styles.generoTexto, seleccionado && styles.generoTextoActivo]}>
                  {g}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Error general */}
        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={18} color={colors.dangerText} />
            <Text style={styles.errorTexto}>{error}</Text>
          </View>
        ) : null}

        {/* Botón guardar al pie (alternativa al del header para pantallas chicas) */}
        <Pressable
          onPress={guardar}
          disabled={guardando}
          style={({ pressed }) => [styles.botonGuardar, pressed && styles.botonPresionado, guardando && styles.botonDeshabilitado]}
          accessibilityRole="button"
        >
          {guardando
            ? <ActivityIndicator color={colors.accentText} />
            : <Text style={styles.botonTexto}>Guardar cambios</Text>}
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Barra superior con flecha + título + botón Guardar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topBarBtn: {
    width: 56,
    alignItems: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  guardarText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },

  seccion: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },

  campo: { marginBottom: 20 },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  inputMultiline: {
    height: 100,
    paddingTop: 12,
  },
  contador: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  ayuda: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },

  // Chips de géneros
  generosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginBottom: 24,
  },
  generoChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  generoChipActivo: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  generoTexto: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  generoTextoActivo: {
    color: colors.accentText,
    fontWeight: '700',
  },

  // Mensaje de error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
    marginBottom: 16,
  },
  errorTexto: {
    flex: 1,
    color: colors.dangerText,
    fontSize: 13,
  },

  // Botón principal al pie del formulario
  botonGuardar: {
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  botonPresionado: { opacity: 0.85 },
  botonDeshabilitado: { opacity: 0.5 },
  botonTexto: {
    color: colors.accentText,
    fontSize: 16,
    fontWeight: '700',
  },
});
