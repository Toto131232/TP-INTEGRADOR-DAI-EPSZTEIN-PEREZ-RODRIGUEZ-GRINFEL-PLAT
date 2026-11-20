import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import Cover from './Cover';
import Stars from './Stars';
import { ESTADOS } from '../estados';
import { colors, radius } from '../theme';

// Menú de una canción de la biblioteca. Tiene dos modos:
// - 'acciones': cambiar estado, puntuar y quitar
// - 'quitar': confirmación antes de quitarla
// La confirmación va dentro del mismo panel para no abrir dos Modal a la vez.
export default function SongActionsSheet({
  cancion,
  modo,
  enviando,
  error,
  onClose,
  onCambiarEstado,
  onPuntuar,
  onPedirQuitar,
  onConfirmarQuitar,
  onVerDetalle,
}) {
  return (
    <BottomSheet visible={cancion !== null} onClose={onClose}>
      {cancion && modo === 'quitar' ? (
        <ConfirmarQuitar
          cancion={cancion}
          enviando={enviando}
          error={error}
          onCancelar={onClose}
          onConfirmar={onConfirmarQuitar}
        />
      ) : null}
      {cancion && modo === 'acciones' ? (
        <Acciones
          cancion={cancion}
          enviando={enviando}
          error={error}
          onCambiarEstado={onCambiarEstado}
          onPuntuar={onPuntuar}
          onPedirQuitar={onPedirQuitar}
          onVerDetalle={onVerDetalle}
        />
      ) : null}
    </BottomSheet>
  );
}

function Acciones({ cancion, enviando, error, onCambiarEstado, onPuntuar, onPedirQuitar, onVerDetalle }) {
  return (
    <>
      <View style={styles.cabecera}>
        <Cover uri={cancion.portada_url} size={56} radius={radius.sm} />
        <View style={styles.cabeceraTexto}>
          <Text style={styles.titulo} numberOfLines={1}>{cancion.titulo}</Text>
          <Text style={styles.artista} numberOfLines={1}>{cancion.artista_nombre}</Text>
        </View>
        {enviando ? <ActivityIndicator color={colors.accent} /> : null}
      </View>

      <Text style={styles.seccion}>Estado</Text>
      <View style={styles.estados}>
        {ESTADOS.map((e) => {
          const activo = e.key === cancion.estado;
          return (
            <Pressable
              key={e.key}
              onPress={() => onCambiarEstado(e.key)}
              disabled={enviando}
              style={[styles.estado, activo && styles.estadoActivo, enviando && styles.deshabilitado]}
              accessibilityRole="radio"
              accessibilityState={{ checked: activo, disabled: enviando }}
            >
              <Text style={[styles.estadoText, activo && styles.estadoTextActivo]} numberOfLines={1}>
                {e.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.seccion}>Tu puntuación</Text>
      <View style={styles.puntuacion}>
        <Stars value={cancion.puntuacion ?? 0} size={30} onChange={onPuntuar} disabled={enviando} />
        <Text style={styles.puntuacionText}>
          {cancion.puntuacion ? `${cancion.puntuacion} de 5` : 'Sin puntuar'}
        </Text>
      </View>

      {error ? <MensajeError texto={error} /> : null}

      {onVerDetalle ? (
        <Opcion icono="open-outline" texto="Ver detalle" onPress={onVerDetalle} disabled={enviando} />
      ) : null}
      <Opcion
        icono="trash-outline"
        texto="Quitar de la biblioteca"
        peligro
        onPress={onPedirQuitar}
        disabled={enviando}
      />
    </>
  );
}

function ConfirmarQuitar({ cancion, enviando, error, onCancelar, onConfirmar }) {
  return (
    <View style={styles.confirmar}>
      <View style={styles.confirmarIcono}>
        <Ionicons name="trash-outline" size={26} color={colors.dangerText} />
      </View>
      <Text style={styles.confirmarTitulo}>¿Quitar de tu biblioteca?</Text>
      <Text style={styles.confirmarTexto}>
        Se va a quitar “{cancion.titulo}” de {cancion.artista_nombre}, junto con su estado y su
        puntuación.
      </Text>

      {error ? <MensajeError texto={error} /> : null}

      <View style={styles.botones}>
        <Pressable
          onPress={onCancelar}
          disabled={enviando}
          style={[styles.boton, styles.botonCancelar, enviando && styles.deshabilitado]}
          accessibilityRole="button"
        >
          <Text style={styles.botonCancelarText}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={onConfirmar}
          disabled={enviando}
          style={[styles.boton, styles.botonQuitar]}
          accessibilityRole="button"
          accessibilityState={{ disabled: enviando, busy: enviando }}
        >
          {enviando ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.botonQuitarText}>Quitar</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Opcion({ icono, texto, onPress, disabled, peligro = false }) {
  const color = peligro ? colors.dangerText : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.opcion, (pressed || disabled) && styles.deshabilitado]}
      accessibilityRole="button"
    >
      <Ionicons name={icono} size={20} color={color} />
      <Text style={[styles.opcionText, { color }]}>{texto}</Text>
    </Pressable>
  );
}

function MensajeError({ texto }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={18} color={colors.dangerText} />
      <Text style={styles.errorText}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cabeceraTexto: { flex: 1, marginHorizontal: 12 },
  titulo: { color: colors.text, fontSize: 17, fontWeight: '800' },
  artista: { color: colors.textMuted, fontSize: 14, marginTop: 2 },

  seccion: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  estados: { flexDirection: 'row', gap: 8 },
  estado: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  estadoActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  estadoText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  estadoTextActivo: { color: colors.accentText, fontWeight: '800' },

  puntuacion: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  puntuacionText: { color: colors.textMuted, fontSize: 14 },

  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  opcionText: { fontSize: 15, fontWeight: '600' },
  deshabilitado: { opacity: 0.5 },

  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
  },
  errorText: { flex: 1, color: colors.dangerText, fontSize: 13 },

  confirmar: { alignItems: 'stretch' },
  confirmarIcono: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmarTitulo: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  confirmarTexto: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  botones: { flexDirection: 'row', gap: 12, marginTop: 22 },
  boton: {
    flex: 1,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCancelar: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  botonCancelarText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  botonQuitar: { backgroundColor: colors.danger },
  botonQuitarText: { color: colors.accentText, fontSize: 15, fontWeight: '800' },
});
