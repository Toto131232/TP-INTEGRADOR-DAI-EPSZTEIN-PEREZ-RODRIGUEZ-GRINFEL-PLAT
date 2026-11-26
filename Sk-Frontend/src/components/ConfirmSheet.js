import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import { Aviso } from './ScreenStates';
import { colors, radius } from '../theme';

// Confirmación antes de una acción que borra algo (mismo diseño que la de la biblioteca).
// Mientras "enviando" es true los botones quedan deshabilitados (no hay doble envío).
export default function ConfirmSheet({
  visible,
  icono = 'trash-outline',
  titulo,
  texto,
  boton = 'Borrar',
  enviando,
  error,
  onCancelar,
  onConfirmar,
}) {
  return (
    // Mientras se envía, tocar el fondo no cierra el panel
    <BottomSheet visible={visible} onClose={enviando ? () => {} : onCancelar}>
      <View style={styles.icono}>
        <Ionicons name={icono} size={26} color={colors.dangerText} />
      </View>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.texto}>{texto}</Text>

      {error ? <Aviso texto={error} /> : null}

      <View style={styles.botones}>
        <Pressable
          onPress={onCancelar}
          disabled={enviando}
          style={[styles.boton, styles.cancelar, enviando && styles.deshabilitado]}
          accessibilityRole="button"
        >
          <Text style={styles.cancelarText}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={onConfirmar}
          disabled={enviando}
          style={[styles.boton, styles.confirmar]}
          accessibilityRole="button"
          accessibilityState={{ disabled: enviando, busy: enviando }}
        >
          {enviando ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.confirmarText}>{boton}</Text>
          )}
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  icono: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  titulo: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  texto: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  botones: { flexDirection: 'row', gap: 12, marginTop: 22 },
  boton: { flex: 1, height: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  cancelar: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  cancelarText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  confirmar: { backgroundColor: colors.danger },
  confirmarText: { color: colors.accentText, fontSize: 15, fontWeight: '800' },
  deshabilitado: { opacity: 0.5 },
});
