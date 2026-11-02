import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

// Cuadrado de color con las iniciales, usado como "portada" de un tema.
export default function CoverTile({ initials, color, darkText = false, size = 52 }) {
  return (
    <View style={[styles.tile, { backgroundColor: color, width: size, height: size }]}>
      <Text style={[styles.initials, { color: darkText ? colors.textDark : colors.text }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 14,
    fontWeight: '700',
  },
});
