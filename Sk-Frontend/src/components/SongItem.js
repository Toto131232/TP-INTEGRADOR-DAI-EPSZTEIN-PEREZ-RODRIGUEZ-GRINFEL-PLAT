import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

const formatDuration = (seg) => {
  if (!seg) return '';
  const m = Math.floor(seg / 60);
  const s = String(seg % 60).padStart(2, '0');
  return `${m}:${s}`;
};

function SongItem({ song, onPress }) {
  return (
    <Pressable
      onPress={onPress ? () => onPress(song) : undefined}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {song.album.portadaUrl ? (
        <Image source={{ uri: song.album.portadaUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {song.titulo}
          {song.explicito ? <Text style={styles.explicit}>  E</Text> : null}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {song.artista.nombre}
          {song.album.titulo ? ` · ${song.album.titulo}` : ''}
        </Text>
      </View>
      <Text style={styles.duration}>{formatDuration(song.duracionSeg)}</Text>
    </Pressable>
  );
}

export default memo(SongItem);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pressed: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  cover: { width: 52, height: 52, borderRadius: 6 },
  coverPlaceholder: { backgroundColor: '#2A3457' },
  info: { flex: 1, marginHorizontal: 12 },
  title: { color: '#fff', fontSize: 15, fontWeight: '600' },
  explicit: { color: '#999', fontSize: 11, fontWeight: '700' },
  subtitle: { color: '#9AA3BA', fontSize: 13, marginTop: 2 },
  duration: { color: '#888', fontSize: 12 },
});
