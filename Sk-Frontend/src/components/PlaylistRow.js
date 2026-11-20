import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PlaylistCover from './PlaylistCover';
import { cantidadCanciones } from '../formato';
import { colors, radius } from '../theme';

// Fila de la pestaña Playlists: portada, nombre, "Playlist · de <username> · N canciones" y tacho.
function PlaylistRow({ playlist, username, onPress, onBorrar }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onPress(playlist)}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Abrir la playlist ${playlist.nombre}`}
      >
        <PlaylistCover playlist={playlist} size={56} radius={radius.sm} />
        <View style={styles.info}>
          <Text style={styles.nombre} numberOfLines={1}>{playlist.nombre}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {/* Si no se conoce el usuario (backend caído al abrir la app) se omite "de ..." */}
            {['Playlist', username ? `de ${username}` : null, cantidadCanciones(playlist.cantidad_canciones)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => onBorrar(playlist)}
        hitSlop={8}
        style={styles.icono}
        accessibilityRole="button"
        accessibilityLabel={`Borrar la playlist ${playlist.nombre}`}
      >
        <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export default memo(PlaylistRow);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 12 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  pressed: { opacity: 0.7 },
  info: { flex: 1, marginLeft: 14 },
  nombre: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  icono: { padding: 8 },
});
