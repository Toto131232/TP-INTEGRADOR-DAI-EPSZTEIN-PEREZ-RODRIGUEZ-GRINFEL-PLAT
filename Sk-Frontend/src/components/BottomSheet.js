import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';

// Panel que aparece desde abajo, encima de todo. Tocar el fondo oscuro lo cierra.
// Se usa Modal (y no Alert) porque Alert no funciona en la versión web.
// KeyboardAvoidingView: en iOS sube el panel cuando se abre el teclado (formularios).
export default function BottomSheet({ visible, onClose, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.fondo} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.panel, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.manija} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  fondo: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  panel: {
    width: '100%',
    maxWidth: 560, // en web (pantallas anchas) no se estira de punta a punta
    maxHeight: '90%', // si el contenido es largo (listas), se scrollea adentro
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  manija: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.track,
    marginBottom: 16,
  },
});
