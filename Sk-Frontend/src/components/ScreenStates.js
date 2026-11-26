import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from './PrimaryButton';
import { colors, radius } from '../theme';

// Estados de una pantalla con el mismo diseño que la pestaña Canciones de la biblioteca
// (cargando, vacío y error con reintentar), más un aviso chico para usar dentro de los menús.

export function Cargando() {
  return (
    <View style={styles.centro}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

// boton y onPress son opcionales
export function Vacio({ icono, titulo, texto, boton, onPress }) {
  return (
    <View style={styles.centro}>
      <Ionicons name={icono} size={44} color={colors.textMuted} />
      <Text style={styles.titulo}>{titulo}</Text>
      {texto ? <Text style={styles.texto}>{texto}</Text> : null}
      {boton ? <PrimaryButton title={boton} onPress={onPress} style={styles.boton} /> : null}
    </View>
  );
}

export function ErrorBox({ mensaje, boton = 'Reintentar', onPress }) {
  return (
    <View style={styles.centro}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.danger} />
      <Text style={styles.error}>{mensaje}</Text>
      <Pressable onPress={onPress} style={styles.retry} accessibilityRole="button">
        <Text style={styles.retryText}>{boton}</Text>
      </Pressable>
    </View>
  );
}

// tipo: 'error' (rojo) | 'exito' (verde)
export function Aviso({ tipo = 'error', texto }) {
  const exito = tipo === 'exito';
  return (
    <View style={[styles.aviso, exito ? styles.avisoExito : styles.avisoError]} accessibilityRole="alert">
      <Ionicons
        name={exito ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        size={18}
        color={exito ? colors.success : colors.dangerText}
      />
      <Text style={[styles.avisoText, { color: exito ? colors.success : colors.dangerText }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  titulo: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 14 },
  texto: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 6 },
  boton: { marginTop: 20, width: '100%', maxWidth: 320 },
  error: { color: colors.danger, fontSize: 15, textAlign: 'center', marginTop: 12 },
  retry: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.text,
  },
  retryText: { color: colors.text, fontWeight: '600' },

  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  avisoError: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg },
  avisoExito: { borderColor: colors.success, backgroundColor: colors.surfaceAlt },
  avisoText: { flex: 1, fontSize: 13 },
});
