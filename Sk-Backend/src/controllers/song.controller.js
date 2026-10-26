import { songService } from '../services/song.service.js';

export const getSongs = async (req, res) => {
  res.json(await songService.getAll());
};

export const getSong = async (req, res) => {
  res.json(await songService.getById(Number(req.params.id)));
};

export const createSong = async (req, res) => {
  res.status(201).json(await songService.create(req.body));
};

export const updateSong = async (req, res) => {
  res.json(await songService.update(Number(req.params.id), req.body));
};

export const deleteSong = async (req, res) => {
  await songService.delete(Number(req.params.id));
  res.status(204).end();
};
