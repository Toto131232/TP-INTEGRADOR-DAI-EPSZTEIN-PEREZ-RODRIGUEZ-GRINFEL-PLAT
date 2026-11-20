// Estados de una canción en la biblioteca. "key" es el valor que acepta el backend.
export const ESTADOS = [
  { key: 'quiero_escuchar', label: 'Quiero escuchar' },
  { key: 'escuchando', label: 'Escuchando' },
  { key: 'escuchado', label: 'Escuchado' },
];

export const estadoLabel = (key) => ESTADOS.find((e) => e.key === key)?.label ?? key;
