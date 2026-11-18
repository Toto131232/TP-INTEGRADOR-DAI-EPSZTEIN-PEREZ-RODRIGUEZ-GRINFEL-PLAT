import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthField from '../components/AuthField';
import PrimaryButton from '../components/PrimaryButton';
import { login } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { colors, radius } from '../theme';

export default function LoginScreen({ onGoToRegister }) {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);

  const onSubmit = async () => {
    if (loading) return;
    if (!usuario.trim() || !password) {
      setError('Completá tu usuario y contraseña');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session = await login(usuario.trim(), password);
      await signIn(session);
    } catch (err) {
      setError(err.status === 401 ? 'Usuario o contraseña incorrectos' : err.message);
      setLoading(false);
    }
  };

  // Al editar se borra el error anterior
  const editar = (setter) => (text) => {
    setter(text);
    if (error) setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          {/* Logo */}
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>SK</Text>
            </View>
            <Text style={styles.appName}>
              SK<Text style={styles.appNameAccent}>Music</Text>
            </Text>
            <Text style={styles.tagline}>Escuchá. Calificá. Contá qué te pareció.</Text>
          </View>

          <AuthField
            label="Email o nombre de usuario"
            placeholder="lucas@mail.com"
            value={usuario}
            onChangeText={editar(setUsuario)}
            keyboardType="email-address"
            textContentType="username"
            autoComplete="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
          <AuthField
            ref={passwordRef}
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChangeText={editar(setPassword)}
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={18} color={colors.dangerText} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <PrimaryButton title="Iniciar sesión" onPress={onSubmit} loading={loading} />
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>¿No tenés cuenta? </Text>
            <Pressable onPress={onGoToRegister} hitSlop={8} accessibilityRole="link">
              <Text style={styles.switchLink}>Registrate</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  brand: { alignItems: 'center', marginBottom: 36 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    borderWidth: 2.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoText: { color: colors.accent, fontSize: 22, fontWeight: '800' },
  appName: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  appNameAccent: { color: colors.accent },
  tagline: { color: colors.textMuted, fontSize: 14, marginTop: 12, textAlign: 'center' },

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
  },
  errorText: { flex: 1, color: colors.dangerText, fontSize: 13 },

  footer: { marginTop: 32 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  switchText: { color: colors.textMuted, fontSize: 14 },
  switchLink: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
