import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { duracion, iniciales } from '../formato';
import { colors, coverColors, radius } from '../theme';

const SIZE = 46;

// Fila numerada del detalle de una playlist: posición, portada, título, artista, duración y "–".
// onPress es opcional: si no viene (todavía no hay detalle de canción), la fila no se puede tocar.
function PlaylistSongRow({ cancion, onPress, onQuitar }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress ? () => onPress(cancion) : undefined}
        disabled={!onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        accessibilityLabel={`${cancion.posicion}. ${cancion.titulo}, de ${cancion.artista_nombre}`}
      >
        <Text style={styles.posicion}>{cancion.posicion}</Text>
        <Portada cancion={cancion} />
        <View style={styles.info}>
          <Text style={styles.titulo} numberOfLines={1}>{cancion.titulo}</Text>
          <Text style={styles.artista} numberOfLines={1}>{cancion.artista_nombre}</Text>
        </View>
        <Text style={styles.duracion}>{duracion(cancion.duracion_seg)}</Text>
      </Pressable>
      <Pressable
        onPress={() => onQuitar(cancion)}
        hitSlop={8}
        style={styles.icono}
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${cancion.titulo} de la playlist`}
      >
        <Ionicons name="remove-circle-outline" size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

// Portada del álbum o, si no hay, un cuadrado de color con las iniciales del artista.
// El color sale del deezer_id, así la misma canción siempre tiene el mismo.
function Portada({ cancion }) {
  if (cancion.portada_url) {
    return <Image source={{ uri: cancion.portada_url }} style={styles.portada} />;
  }
  const color = coverColors[cancion.deezer_id % coverColors.length];
  return (
    <View style={[styles.portada, styles.inicialesBox, { backgroundColor: color.bg }]}>
      <Text style={[styles.iniciales, { color: color.text }]}>{iniciales(cancion.artista_nombre)}</Text>
    </View>
  );
}

export default memo(PlaylistSongRow);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 12 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  pressed: { opacity: 0.7 },
  posicion: { width: 24, color: colors.textMuted, fontSize: 14, textAlign: 'center', marginRight: 8 },
  portada: { width: SIZE, height: SIZE, borderRadius: radius.sm },
  inicialesBox: { alignItems: 'center', justifyContent: 'center' },
  iniciales: { fontSize: 14, fontWeight: '800' },
  info: { flex: 1, marginLeft: 12 },
  titulo: { color: colors.text, fontSize: 15, fontWeight: '700' },
  artista: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  duracion: { color: colors.textMuted, fontSize: 12, marginLeft: 8 },
  icono: { padding: 8 },
});
