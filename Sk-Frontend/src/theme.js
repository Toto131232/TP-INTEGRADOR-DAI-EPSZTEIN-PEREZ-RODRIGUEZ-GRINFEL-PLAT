// Paleta de SKMusic (azul noche + amarillo).
export const colors = {
  bg: '#0B1022',
  surface: '#141D38',
  surfaceAlt: '#0E1530',
  border: '#1E2949',
  text: '#FFFFFF',
  textMuted: '#9AA3BA',
  accent: '#E8B33C',
  accentText: '#0B1022',
  track: '#2A3457',
  danger: '#FF6B6B',
  dangerText: '#F28B8B',
  dangerBg: '#2A1424',
  dangerBorder: '#5A2433',
  success: '#4ADE80',
  inputBg: '#132042',
  inputBorder: '#22305A',
  placeholder: '#6B7594',
  overlay: 'rgba(5, 8, 20, 0.7)', // fondo oscuro detrás de los menús
  headerBlue: '#1C3470', // cabecera del detalle de playlist (el mismo azul que el detalle de canción)
};

export const radius = { sm: 6, md: 10, lg: 16, full: 999 };

// Colores de las portadas sin imagen: el mosaico 2x2 de las playlists y el cuadrado con
// iniciales de las canciones. "text" es el color de las iniciales que se lee bien sobre "bg".
// Son 7, un número primo: PlaylistCover usa eso para que los 4 colores del mosaico no se repitan.
export const coverColors = [
  { bg: '#3B6FE0', text: '#FFFFFF' }, // azul
  { bg: '#E8B33C', text: '#0B1022' }, // dorado
  { bg: '#6C4FC4', text: '#FFFFFF' }, // violeta
  { bg: '#C9583D', text: '#FFFFFF' }, // naranja
  { bg: '#2A9D8F', text: '#FFFFFF' }, // verde agua
  { bg: '#DCD3BF', text: '#0B1022' }, // crema
  { bg: '#1E2B55', text: '#FFFFFF' }, // azul noche
];
