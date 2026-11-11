import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoverTile from './CoverTile';
import { colors } from '../theme/colors';

export default function MiniPlayer({ track }) {
  const [liked, setLiked] = useState(true);
  const [playing, setPlaying] = useState(true);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <CoverTile initials={track.initials} color={track.color} size={36} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={() => setLiked(!liked)} style={styles.action}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={colors.primary} />
        </Pressable>
        <Pressable hitSlop={8} onPress={() => setPlaying(!playing)} style={styles.action}>
          <Ionicons name={playing ? 'pause' : 'play'} size={20} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${track.progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 10,
    marginHorizontal: 6,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  artist: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  action: {
    paddingHorizontal: 8,
  },
  track: {
    height: 2,
    backgroundColor: 'transparent',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
