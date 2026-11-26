import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Cover from './Cover';
import EstadoBadge from './EstadoBadge';
import Stars from './Stars';
import { colors, radius } from '../theme';

// Fila de una canción de la biblioteca. Usa los campos tal como los manda el backend
// (snake_case: portada_url, artista_nombre...), por eso no se reutiliza SongItem.
function LibraryRow({ cancion, onPress, onOpciones, onQuitar }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onPress(cancion)}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${cancion.titulo}, de ${cancion.artista_nombre}`}
      >
        <Cover uri={cancion.portada_url} size={52} radius={radius.sm} />
        <View style={styles.info}>
          <Text style={styles.titulo} numberOfLines={1}>{cancion.titulo}</Text>
          <Text style={styles.artista} numberOfLines={1}>{cancion.artista_nombre}</Text>
          <View style={styles.meta}>
            <EstadoBadge estado={cancion.estado} />
            {cancion.puntuacion ? <Stars value={cancion.puntuacion} size={11} /> : null}
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={() => onOpciones(cancion)}
        hitSlop={8}
        style={styles.icono}
        accessibilityRole="button"
        accessibilityLabel={`Opciones de ${cancion.titulo}`}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
      </Pressable>
      <Pressable
        onPress={() => onQuitar(cancion)}
        hitSlop={8}
        style={styles.icono}
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${cancion.titulo} de la biblioteca`}
      >
        <Ionicons name="remove-circle-outline" size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export default memo(LibraryRow);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 12 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  pressed: { opacity: 0.7 },
  info: { flex: 1, marginLeft: 12 },
  titulo: { color: colors.text, fontSize: 15, fontWeight: '700' },
  artista: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  icono: { padding: 8 },
});
