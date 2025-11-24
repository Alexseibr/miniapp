import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import Ad from '../../../models/Ad.js';
import Favorite from '../../../models/Favorite.js';
import User from '../../../models/User.js';
import { mobileAuth } from '../middleware/mobileAuth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';
import { ensureNumericUserId } from '../utils/user.js';

const router = Router();

async function resolveUserFromAuthHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    return user || null;
  } catch (error) {
    return null;
  }
}

function buildMatchQuery(filters) {
  const query = { status: 'active' };

  if (filters.categoryId) query.categoryId = filters.categoryId;
  if (filters.subcategoryId) query.subcategoryId = filters.subcategoryId;
  if (filters.city) query.city = filters.city;
  if (filters.region) query.cityCode = filters.region.toLowerCase();
  if (filters.minPrice != null || filters.maxPrice != null) {
    query.price = {};
    if (filters.minPrice != null) query.price.$gte = filters.minPrice;
    if (filters.maxPrice != null) query.price.$lte = filters.maxPrice;
  }

  if (filters.q) {
    query.$or = [
      { title: { $regex: filters.q, $options: 'i' } },
      { description: { $regex: filters.q, $options: 'i' } },
    ];
  }

  return query;
}

function buildSort(sortBy) {
  switch (sortBy) {
    case 'cheap':
      return { price: 1 };
    case 'expensive':
      return { price: -1 };
    case 'near':
      return { distance: 1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
}

const listQuerySchema = z.object({
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  sortBy: z.enum(['new', 'cheap', 'expensive', 'near']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

const adPayloadSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  categoryId: z.string(),
  subcategoryId: z.string(),
  price: z.coerce.number().min(0),
  currency: z.string().default('BYN'),
  photos: z.array(z.string()).optional(),
  attributes: z.record(z.string()).optional(),
  city: z.string().optional(),
  cityCode: z.string().optional(),
  seasonCode: z.string().optional(),
  status: z.enum(['draft', 'active', 'hidden']).optional(),
  location: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
});

const nearbySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radiusKm: z.coerce.number().default(10),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

router.get('/', validateQuery(listQuerySchema), async (req, res) => {
  try {
    const filters = req.validatedQuery;
    const match = buildMatchQuery(filters);
    const sort = buildSort(filters.sortBy);
    const page = filters.page;
    const limit = filters.limit;
    const skip = (page - 1) * limit;
    const hasGeo = filters.lat != null && filters.lng != null;

    const pipeline = [];
    if (hasGeo) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [filters.lng, filters.lat] },
          spherical: true,
          distanceField: 'distance',
        },
      });
    }

    pipeline.push({ $match: match });

    const facetPipeline = [
      {
        $facet: {
          items: [
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                title: 1,
                description: 1,
                price: 1,
                currency: 1,
                city: 1,
                photos: 1,
                sellerTelegramId: 1,
                distance: 1,
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
      {
        $project: {
          items: 1,
          total: { $ifNull: [{ $arrayElemAt: ['$total.count', 0] }, 0] },
        },
      },
    ];

    const [{ items, total }] = await Ad.aggregate([...pipeline, ...facetPipeline]);

    let favoriteIds = new Set();
    const user = await resolveUserFromAuthHeader(req);
    if (user) {
      const numericId = await ensureNumericUserId(user);
      const favorites = await Favorite.find({ userTelegramId: String(numericId) }, { adId: 1 }).lean();
      favoriteIds = new Set(favorites.map((fav) => fav.adId.toString()));
    }

    const enrichedItems = items.map((item) => ({
      id: item._id,
      title: item.title,
      description: item.description?.slice(0, 200) || '',
      price: item.price,
      currency: item.currency,
      city: item.city,
      distance: item.distance || null,
      thumbnail: Array.isArray(item.photos) && item.photos.length ? item.photos[0] : null,
      isFavorite: favoriteIds.has(item._id.toString()),
    }));

    return sendSuccess(res, enrichedItems, {
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    return handleRouteError(res, error, 'ADS_FETCH_FAILED');
  }
});

router.get('/nearby', validateQuery(nearbySchema), async (req, res) => {
  try {
    const { lat, lng, radiusKm, page, limit, categoryId, subcategoryId } = req.validatedQuery;
    const skip = (page - 1) * limit;
    const match = buildMatchQuery({ categoryId, subcategoryId });

    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          spherical: true,
          distanceField: 'distance',
          maxDistance: radiusKm * 1000,
        },
      },
      { $match: match },
      {
        $facet: {
          items: [
            { $sort: { distance: 1 } },
            { $skip: skip },
            { $limit: limit },
          ],
          total: [{ $count: 'count' }],
        },
      },
      { $project: { items: 1, total: { $ifNull: [{ $arrayElemAt: ['$total.count', 0] }, 0] } } },
    ];

    const [{ items, total }] = await Ad.aggregate(pipeline);

    return sendSuccess(res, items, {
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    return handleRouteError(res, error, 'NEARBY_FETCH_FAILED');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id).lean();
    if (!ad) {
      return sendError(res, 404, 'NOT_FOUND', 'Объявление не найдено');
    }

    let isFavorite = false;
    const user = await resolveUserFromAuthHeader(req);
    if (user) {
      const numericId = await ensureNumericUserId(user);
      isFavorite = await Favorite.exists({ userTelegramId: String(numericId), adId: ad._id });
    }

    const seller = ad.sellerTelegramId
      ? await User.findOne({ telegramId: ad.sellerTelegramId }).lean()
      : null;

    return sendSuccess(res, {
      id: ad._id,
      title: ad.title,
      description: ad.description,
      price: ad.price,
      currency: ad.currency,
      city: ad.city,
      photos: ad.photos || [],
      attributes: ad.attributes || {},
      seasonCode: ad.seasonCode || null,
      status: ad.status,
      geo: ad.geo || ad.location?.geo || null,
      isFavorite: !!isFavorite,
      seller: seller
        ? {
            id: seller._id,
            name: seller.firstName || seller.username || 'Продавец',
            rating: null,
            reviewsCount: 0,
          }
        : null,
    });
  } catch (error) {
    return handleRouteError(res, error, 'AD_FETCH_FAILED');
  }
});

router.post('/', mobileAuth, validateBody(adPayloadSchema), async (req, res) => {
  try {
    const numericId = await ensureNumericUserId(req.currentUser);
    const payload = req.validatedBody;

    const ad = await Ad.create({
      ...payload,
      sellerTelegramId: numericId,
      geo:
        payload.location?.lat != null && payload.location?.lng != null
          ? {
              type: 'Point',
              coordinates: [payload.location.lng, payload.location.lat],
            }
          : undefined,
      location: payload.location
        ? {
            lat: payload.location.lat,
            lng: payload.location.lng,
            geo:
              payload.location.lat != null && payload.location.lng != null
                ? { type: 'Point', coordinates: [payload.location.lng, payload.location.lat] }
                : undefined,
          }
        : undefined,
    });

    return sendSuccess(res, { id: ad._id });
  } catch (error) {
    return handleRouteError(res, error, 'AD_CREATE_FAILED');
  }
});

router.patch('/:id', mobileAuth, validateBody(adPayloadSchema.partial()), async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) {
      return sendError(res, 404, 'NOT_FOUND', 'Объявление не найдено');
    }

    const numericId = await ensureNumericUserId(req.currentUser);
    if (ad.sellerTelegramId !== numericId) {
      return sendError(res, 403, 'FORBIDDEN', 'Можно изменять только свои объявления');
    }

    Object.assign(ad, req.validatedBody);

    if (req.validatedBody?.location) {
      const { lat, lng } = req.validatedBody.location;
      ad.location = {
        ...(ad.location || {}),
        lat,
        lng,
        geo: lat != null && lng != null ? { type: 'Point', coordinates: [lng, lat] } : ad.location?.geo,
      };
      if (lat != null && lng != null) {
        ad.geo = { type: 'Point', coordinates: [lng, lat] };
      }
    }

    await ad.save();
    return sendSuccess(res, { id: ad._id });
  } catch (error) {
    return handleRouteError(res, error, 'AD_UPDATE_FAILED');
  }
});

router.delete('/:id', mobileAuth, async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) {
      return sendError(res, 404, 'NOT_FOUND', 'Объявление не найдено');
    }

    const numericId = await ensureNumericUserId(req.currentUser);
    if (ad.sellerTelegramId !== numericId) {
      return sendError(res, 403, 'FORBIDDEN', 'Можно удалять только свои объявления');
    }

    await Ad.deleteOne({ _id: ad._id });
    return sendSuccess(res, { id: ad._id });
  } catch (error) {
    return handleRouteError(res, error, 'AD_DELETE_FAILED');
  }
});

export default router;
