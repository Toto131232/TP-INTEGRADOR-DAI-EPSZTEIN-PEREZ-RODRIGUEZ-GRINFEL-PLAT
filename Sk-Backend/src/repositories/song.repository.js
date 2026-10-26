import { Song } from '../models/song.model.js';

// Repositorio en memoria. Sustituir por la implementación de la BD elegida
// manteniendo la misma interfaz.
class SongRepository {
  constructor() {
    this.songs = [];
    this.nextId = 1;
  }

  async findAll() {
    return this.songs;
  }

  async findById(id) {
    return this.songs.find((song) => song.id === id) || null;
  }

  async create(data) {
    const song = new Song({ id: this.nextId++, ...data });
    this.songs.push(song);
    return song;
  }

  async update(id, data) {
    const song = await this.findById(id);
    if (!song) return null;
    Object.assign(song, data, { id });
    return song;
  }

  async delete(id) {
    const index = this.songs.findIndex((song) => song.id === id);
    if (index === -1) return false;
    this.songs.splice(index, 1);
    return true;
  }
}

export const songRepository = new SongRepository();
