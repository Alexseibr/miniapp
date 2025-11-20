const Joi = require('joi');

const adCreateSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim().min(3).max(120).required(),
    description: Joi.string().allow('', null).max(5000).default(''),
    price: Joi.number().positive().required(),
    categoryId: Joi.string().trim().required(),
    subcategoryId: Joi.string().trim().required(),
    sellerTelegramId: Joi.number().integer().positive().required(),
    deliveryType: Joi.string()
      .valid('pickup_only', 'delivery_only', 'delivery_and_pickup')
      .optional(),
    deliveryRadiusKm: Joi.number().positive().optional(),
    lat: Joi.number().optional(),
    lng: Joi.number().optional(),
    seasonCode: Joi.string().trim().optional(),
    lifetimeDays: Joi.number().integer().positive().max(30).optional(),
    photos: Joi.array().items(Joi.string().trim().uri({ allowRelative: true })).optional(),
    images: Joi.array().items(Joi.string().trim().uri({ allowRelative: true })).optional(),
    attributes: Joi.object().optional(),
  }).required(),
  query: Joi.object().unknown(true),
  params: Joi.object().unknown(true),
});

module.exports = { adCreateSchema };
