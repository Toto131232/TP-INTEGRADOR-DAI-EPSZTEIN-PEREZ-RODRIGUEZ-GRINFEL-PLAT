import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AuthField from './AuthField';
import PrimaryButton from './PrimaryButton';
import { Aviso } from './ScreenStates';
import * as playlistsApi from '../api/playlists';
import { colors, radius } from '../theme';

// Mismos límites que valida el backend (playlist.controller.js)
const MAX_NOMBRE = 100;
const MAX_DESCRIPCION = 300;
const MAX_PORTADA = 500;

// Devuelve los errores de cada campo ({} si está todo bien). Los textos ya vienen sin espacios de más.
const validar = ({ nombre, descripcion, portada }) => {
  const errores = {};
  if (!nombre) errores.nombre = 'Ponele un nombre a la playlist';
  else if (nombre.length > MAX_NOMBRE) errores.nombre = `Hasta ${MAX_NOMBRE} caracteres`;
  if (descripcion.length > MAX_DESCRIPCION) errores.descripcion = `Hasta ${MAX_DESCRIPCION} caracteres`;
  if (portada && (portada.length > MAX_PORTADA || !/^https?:\/\/\S+$/i.test(portada))) {
    errores.portada = 'Tiene que ser un link que empiece con http:// o https://';
  }
  return errores;
};

// Formulario para crear una playlist (playlist = null) o editarla (playlist = la que se edita).
// Valida antes de enviar, llama al backend y le pasa a onListo la playlist que devolvió.
// Se usa en la pestaña Playlists, en el detalle y en "Agregar a playlist".
export default function PlaylistForm({ playlist = null, textoBoton, onListo, onCancelar }) {
  const editando = playlist !== null;
  const [nombre, setNombre] = useState(playlist?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(playlist?.descripcion ?? '');
  const [portada, setPortada] = useState(playlist?.portada_url ?? '');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const guardar = async () => {
    if (enviando) return;
    const limpio = { nombre: nombre.trim(), descripcion: descripcion.trim(), portada: portada.trim() };
    const nuevosErrores = validar(limpio);
    setErrores(nuevosErrores);
    setErrorGeneral(null);
    if (Object.keys(nuevosErrores).length > 0) return;

    // Vacío = sin descripción / sin portada: se manda null (así también se borran al editar)
    const datos = {
      nombre: limpio.nombre,
      descripcion: limpio.descripcion || null,
      portada_url: limpio.portada || null,
    };

    setEnviando(true);
    try {
      let guardada;
      if (!editando) {
        guardada = await playlistsApi.createPlaylist(datos);
      } else {
        // PATCH: solo se mandan los campos que cambiaron
        const cambios = Object.fromEntries(Object.entries(datos).filter(([campo, valor]) => valor !== playlist[campo]));
        guardada =
          Object.keys(cambios).length > 0
            ? await playlistsApi.updatePlaylist(playlist.id_playlist, cambios)
            : playlist;
      }
      setEnviando(false);
      onListo(guardada);
    } catch (err) {
      setEnviando(false);
      // 409 = ya tiene una playlist con ese nombre: el error va debajo del nombre
      if (err.status === 409) setErrores({ nombre: err.message });
      else setErrorGeneral(err.message);
    }
  };

  // Al escribir en un campo se borra su error
  const cambiar = (campo, setter) => (texto) => {
    setter(texto);
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.titulo}>{editando ? 'Editar playlist' : 'Nueva playlist'}</Text>

      <AuthField
        label="Nombre"
        value={nombre}
        onChangeText={cambiar('nombre', setNombre)}
        placeholder="Ej: Rock para manejar"
        autoCapitalize="sentences"
        maxLength={MAX_NOMBRE}
        editable={!enviando}
        helper={errores.nombre ?? `${nombre.trim().length}/${MAX_NOMBRE}`}
        helperTone={errores.nombre ? 'error' : 'muted'}
      />
      <AuthField
        label="Descripción (opcional)"
        value={descripcion}
        onChangeText={cambiar('descripcion', setDescripcion)}
        placeholder="¿De qué se trata?"
        autoCapitalize="sentences"
        maxLength={MAX_DESCRIPCION}
        editable={!enviando}
        helper={errores.descripcion ?? `${descripcion.trim().length}/${MAX_DESCRIPCION}`}
        helperTone={errores.descripcion ? 'error' : 'muted'}
      />
      <AuthField
        label="URL de la portada (opcional)"
        value={portada}
        onChangeText={cambiar('portada', setPortada)}
        placeholder="https://..."
        keyboardType="url"
        maxLength={MAX_PORTADA}
        editable={!enviando}
        returnKeyType="done"
        onSubmitEditing={guardar}
        helper={errores.portada ?? 'Si la dejás vacía se usa un mosaico de colores'}
        helperTone={errores.portada ? 'error' : 'muted'}
      />

      {errorGeneral ? <Aviso texto={errorGeneral} /> : null}

      <View style={styles.botones}>
        <Pressable
          onPress={onCancelar}
          disabled={enviando}
          style={[styles.cancelar, enviando && styles.deshabilitado]}
          accessibilityRole="button"
        >
          <Text style={styles.cancelarText}>Cancelar</Text>
        </Pressable>
        <PrimaryButton
          title={textoBoton ?? (editando ? 'Guardar' : 'Crear')}
          onPress={guardar}
          loading={enviando}
          style={styles.guardar}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titulo: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 18 },
  botones: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelar: {
    flex: 1,
    height: 50,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelarText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  guardar: { flex: 1 },
  deshabilitado: { opacity: 0.5 },
});
