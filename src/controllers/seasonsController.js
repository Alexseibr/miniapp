import Season from '../models/Season.js';

export async function listSeasons(_req, res) {
  const seasons = await Season.find().sort({ createdAt: -1 });
  res.json(seasons);
}
