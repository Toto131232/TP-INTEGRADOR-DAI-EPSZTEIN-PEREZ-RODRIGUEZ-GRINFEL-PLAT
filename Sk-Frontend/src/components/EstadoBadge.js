import { StyleSheet, Text, View } from 'react-native';
import { estadoLabel } from '../estados';
import { colors, radius } from '../theme';

// Color de la etiqueta según el estado de la canción
const COLORES = {
  quiero_escuchar: { fondo: colors.track, texto: colors.text },
  escuchando: { fondo: colors.accent, texto: colors.accentText },
  escuchado: { fondo: colors.success, texto: colors.accentText },
};

export default function EstadoBadge({ estado }) {
  const color = COLORES[estado] ?? COLORES.quiero_escuchar;
  return (
    <View style={[styles.badge, { backgroundColor: color.fondo }]}>
      <Text style={[styles.text, { color: color.texto }]}>{estadoLabel(estado)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  text: { fontSize: 11, fontWeight: '700' },
});
