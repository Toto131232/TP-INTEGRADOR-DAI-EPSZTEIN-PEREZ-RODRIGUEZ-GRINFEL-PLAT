import { songRepository } from '../repositories/song.repository.js';
import { HttpError } from '../middlewares/error.middleware.js';

class SongService {
  constructor(repository) {
    this.repository = repository;
  }

  getAll() {
    return this.repository.findAll();
  }

  async getById(id) {
    const song = await this.repository.findById(id);
    if (!song) throw new HttpError(404, 'Song not found');
    return song;
  }

  create(data) {
    if (!data.title || !data.artist) {
      throw new HttpError(400, 'title and artist are required');
    }
    return this.repository.create(data);
  }

  async update(id, data) {
    const song = await this.repository.update(id, data);
    if (!song) throw new HttpError(404, 'Song not found');
    return song;
  }

  async delete(id) {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new HttpError(404, 'Song not found');
  }
}

export const songService = new SongService(songRepository);
