import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';

// Pantalla temporal para las pestañas que todavía no están hechas.
// onLogout: muestra "Cerrar sesión" (lo usa Perfil hasta que tenga su pantalla).
export default function PlaceholderScreen({ title, onLogout }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.center}>
        <Text style={styles.text}>Próximamente</Text>
        {onLogout ? (
          <Pressable onPress={onLogout} style={styles.logout} accessibilityRole="button">
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', paddingHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.textMuted, fontSize: 15 },
  logout: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.dangerText,
  },
  logoutText: { color: colors.dangerText, fontWeight: '700' },
});
