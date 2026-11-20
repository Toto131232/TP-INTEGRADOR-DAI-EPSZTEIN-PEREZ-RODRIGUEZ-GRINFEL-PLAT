import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { coverColors } from '../theme';

// Elige los 4 colores del mosaico a partir del id de la playlist, sin pedir nada al backend.
// El id decide desde qué color se empieza y de a cuántos se salta. Como hay 7 colores
// (número primo) y el salto va de 1 a 6, los 4 colores nunca se repiten.
const coloresMosaico = (id) => {
  const n = coverColors.length;
  const inicio = id % n;
  const salto = 1 + (id % (n - 1));
  return [0, 1, 2, 3].map((i) => coverColors[(inicio + i * salto) % n].bg);
};

// Portada de una playlist: la imagen de portada_url o, si no tiene (o la imagen no carga),
// un mosaico 2x2 que es siempre igual para la misma playlist.
export default function PlaylistCover({ playlist, size, radius = 0 }) {
  // Guarda la URL que falló, para mostrar el mosaico en su lugar
  const [urlFallida, setUrlFallida] = useState(null);
  const uri = playlist.portada_url;
  const box = { width: size, height: size, borderRadius: radius };

  if (uri && uri !== urlFallida) {
    return <Image source={{ uri }} style={box} onError={() => setUrlFallida(uri)} />;
  }

  const mitad = size / 2;
  return (
    <View style={[styles.mosaico, box]}>
      {coloresMosaico(playlist.id_playlist).map((color, i) => (
        <View key={i} style={{ width: mitad, height: mitad, backgroundColor: color }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mosaico: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
});
