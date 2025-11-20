import { Request, Response } from 'express';
import Ad from '../models/Ad';

export const getSeasonShowcase = async (req: Request, res: Response) => {
  try {
    const { seasonCode } = req.params;
    const { color, stemLength, packaging, minPrice, maxPrice } = req.query;

    const filters: Record<string, unknown> = {
      seasonCode,
      status: 'active',
    };

    if (color) filters['attributes.color'] = color;
    if (stemLength) filters['attributes.stemLength'] = stemLength;
    if (packaging) filters['attributes.packaging'] = packaging;

    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) (filters.price as Record<string, number>).$gte = Number(minPrice);
      if (maxPrice) (filters.price as Record<string, number>).$lte = Number(maxPrice);
    }

    const ads = await Ad.find(filters).sort({ createdAt: -1 });
    return res.json({ seasonCode, ads });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch season showcase', error });
  }
};
