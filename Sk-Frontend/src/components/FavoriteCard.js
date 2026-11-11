import { Pressable, StyleSheet, Text } from 'react-native';
import CoverTile from './CoverTile';
import { colors } from '../theme/colors';

export default function FavoriteCard({ item }) {
  return (
    <Pressable style={styles.card}>
      <CoverTile initials={item.initials} color={item.color} darkText={item.darkText} size={46} />
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 4,
    overflow: 'hidden',
    height: 46,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
  },
});
