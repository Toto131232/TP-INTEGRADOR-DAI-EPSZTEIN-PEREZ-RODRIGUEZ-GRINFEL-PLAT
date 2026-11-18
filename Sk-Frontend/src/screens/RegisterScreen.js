import { useEffect, useRef, useState } from 'react';
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
import { checkUsername, register } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { colors, radius } from '../theme';

// Mismas reglas que valida el backend (auth.controller.js)
const USERNAME_RE = /^[a-zA-Z0-9_.]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_HINT = 'Mínimo 8 caracteres, con al menos un número';
const DEBOUNCE_MS = 400;

const validarPassword = (p) => p.length >= 8 && p.length <= 72 && /\d/.test(p);

export default function RegisterScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  // Los errores de un campo se muestran recién cuando el usuario sale de él (o al enviar)
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  // null | 'checking' | 'available' | 'taken' | 'error'
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const user = username.trim();
  const mail = email.trim();
  const userFormatoOk = USERNAME_RE.test(user);

  // Consulta al backend si el nombre de usuario está libre (con debounce)
  useEffect(() => {
    if (!userFormatoOk) {
      setDisponibilidad(null);
      return undefined;
    }
    setDisponibilidad('checking');
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { disponible } = await checkUsername(user, { signal: controller.signal });
        setDisponibilidad(disponible ? 'available' : 'taken');
      } catch (err) {
        if (err.name !== 'AbortError') setDisponibilidad('error');
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [user, userFormatoOk]);

  const show = (campo) => submitted || touched[campo];
  const blur = (campo) => () => setTouched((t) => ({ ...t, [campo]: true }));

  // --- Mensajes de cada campo ---
  let userHelper = null;
  let userTone = 'muted';
  if (user && !userFormatoOk && show('username')) {
    userHelper = 'Entre 3 y 50 caracteres: letras, números, _ o .';
    userTone = 'error';
  } else if (!user && show('username')) {
    userHelper = 'Ingresá un nombre de usuario';
    userTone = 'error';
  } else if (disponibilidad === 'checking') {
    userHelper = 'Verificando...';
  } else if (disponibilidad === 'available') {
    userHelper = 'Disponible';
    userTone = 'success';
  } else if (disponibilidad === 'taken') {
    userHelper = 'Ese nombre de usuario ya está en uso';
    userTone = 'error';
  }

  const emailOk = mail.length <= 150 && EMAIL_RE.test(mail);
  const emailError = show('email') && !emailOk ? 'Ingresá un correo válido (ej: nombre@mail.com)' : null;

  const passwordOk = validarPassword(password);
  const passwordError = show('password') && !passwordOk;

  const confirmOk = confirm.length > 0 && confirm === password;
  let confirmError = null;
  if (show('confirm') && !confirm) confirmError = 'Repetí la contraseña';
  else if (show('confirm') && !confirmOk) confirmError = 'Las contraseñas no coinciden';

  const onSubmit = async () => {
    if (loading) return;
    setSubmitted(true);
    setServerError(null);
    if (!userFormatoOk || disponibilidad === 'taken' || !emailOk || !passwordOk || !confirmOk) return;

    setLoading(true);
    try {
      const session = await register({ username: user, email: mail, password });
      await signIn(session);
    } catch (err) {
      if (err.status === 409 && /usuario/i.test(err.message)) setDisponibilidad('taken');
      setServerError(err.message);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <Text style={styles.title}>Creá tu cuenta</Text>
          <Text style={styles.subtitle}>Armá tu biblioteca y empezá a calificar música.</Text>

          <AuthField
            label="Nombre de usuario"
            placeholder="lucasf"
            value={username}
            onChangeText={setUsername}
            onBlur={blur('username')}
            helper={userHelper}
            helperTone={userTone}
            maxLength={50}
            textContentType="username"
            autoComplete="username-new"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            blurOnSubmit={false}
          />
          <AuthField
            ref={emailRef}
            label="Correo electrónico"
            placeholder="lucas@mail.com"
            value={email}
            onChangeText={setEmail}
            onBlur={blur('email')}
            helper={emailError}
            helperTone="error"
            maxLength={150}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
          <AuthField
            ref={passwordRef}
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            onBlur={blur('password')}
            helper={PASSWORD_HINT}
            helperTone={passwordError ? 'error' : 'muted'}
            maxLength={72}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            blurOnSubmit={false}
          />
          <AuthField
            ref={confirmRef}
            label="Confirmar contraseña"
            placeholder="••••••••"
            value={confirm}
            onChangeText={setConfirm}
            onBlur={blur('confirm')}
            helper={confirmError}
            helperTone="error"
            maxLength={72}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />

          {serverError ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={18} color={colors.dangerText} />
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <PrimaryButton title="Crear cuenta" onPress={onSubmit} loading={loading} />
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>¿Ya tenés cuenta? </Text>
            <Pressable onPress={onBack} hitSlop={8} accessibilityRole="link">
              <Text style={styles.switchLink}>Iniciá sesión</Text>
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

  back: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 6, marginBottom: 24 },

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
