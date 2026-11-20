import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const NUMEROS = [1, 2, 3, 4, 5];

// 5 estrellas. Sin onChange solo muestran la puntuación; con onChange se pueden tocar.
export default function Stars({ value = 0, size = 12, onChange, disabled = false }) {
  return (
    <View style={styles.row}>
      {NUMEROS.map((n) => {
        const icono = (
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={colors.accent} />
        );
        if (!onChange) return <View key={n}>{icono}</View>;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            disabled={disabled}
            hitSlop={4}
            style={disabled && styles.disabled}
            accessibilityRole="button"
            accessibilityLabel={n === 1 ? '1 estrella' : `${n} estrellas`}
            accessibilityState={{ selected: n === value, disabled }}
          >
            {icono}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  disabled: { opacity: 0.5 },
});
