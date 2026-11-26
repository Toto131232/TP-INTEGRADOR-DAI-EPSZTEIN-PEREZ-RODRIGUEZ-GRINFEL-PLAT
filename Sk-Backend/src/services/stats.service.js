import * as statsRepository from '../repositories/stats.repository.js';

// Períodos válidos que acepta el endpoint
export const PERIODOS_VALIDOS = ['mes', 'anio', 'todo'];

// Reúne todas las estadísticas en una sola llamada.
// periodo: 'mes' | 'anio' | 'todo'
export const getStats = async (idUsuario, periodo) => {
  // Todas las queries corren en paralelo para no sumar tiempos de espera
  const [calificacion, resenas, topArtistas, generos] = await Promise.all([
    statsRepository.getCalificacion(idUsuario, periodo),
    statsRepository.getResenas(idUsuario, periodo),
    statsRepository.getTopArtistas(idUsuario, periodo),
    statsRepository.getGeneros(idUsuario, periodo),
  ]);

  return {
    periodo,
    anio: new Date().getFullYear(),
    calificacion: {
      promedio: calificacion.promedio,   // null si no hay canciones calificadas
      cantidad: calificacion.cantidad,
    },
    resenas: {
      total: resenas.total,
    },
    topArtistas,   // [{ artista_nombre, cantidad }]
    generos,       // [{ genero, cantidad, porcentaje }]
  };
};
