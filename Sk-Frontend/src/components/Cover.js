import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Portada de una canción. Si no hay URL muestra un ícono de nota.
export default function Cover({ uri, size, radius = 0, style }) {
  const box = { width: size, height: size, borderRadius: radius };
  if (!uri) {
    return (
      <View style={[styles.placeholder, box, style]}>
        <Ionicons name="musical-notes" size={size * 0.4} color={colors.textMuted} />
      </View>
    );
  }
  return <Image source={{ uri }} style={[box, style]} />;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
