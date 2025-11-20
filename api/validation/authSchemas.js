const Joi = require('joi');

const phonePattern = /^\+?\d{10,15}$/;

const requestCodeSchema = Joi.object({
  body: Joi.object({
    phone: Joi.string()
      .pattern(phonePattern)
      .required()
      .messages({
        'string.empty': 'Укажите номер телефона',
        'string.pattern.base': 'Телефон должен быть в международном формате',
      }),
  }).required(),
  query: Joi.object().unknown(true),
  params: Joi.object().unknown(true),
});

const smsLoginSchema = Joi.object({
  body: Joi.object({
    phone: Joi.string()
      .pattern(phonePattern)
      .required()
      .messages({
        'string.empty': 'Укажите номер телефона',
        'string.pattern.base': 'Телефон должен быть в международном формате',
      }),
    code: Joi.string()
      .trim()
      .pattern(/^\d{4,6}$/)
      .required()
      .messages({
        'string.empty': 'Код обязателен',
        'string.pattern.base': 'Код должен состоять из 4–6 цифр',
      }),
  }).required(),
  query: Joi.object().unknown(true),
  params: Joi.object().unknown(true),
});

const telegramConfirmSchema = Joi.object({
  body: Joi.object({
    token: Joi.string().trim().required(),
    telegramId: Joi.alternatives()
      .try(Joi.string().trim(), Joi.number())
      .required(),
    username: Joi.string().allow(null, '').optional(),
    firstName: Joi.string().allow(null, '').optional(),
    lastName: Joi.string().allow(null, '').optional(),
    phone: Joi.string().pattern(phonePattern).required(),
  }).required(),
  query: Joi.object().unknown(true),
  params: Joi.object().unknown(true),
});

module.exports = {
  requestCodeSchema,
  smsLoginSchema,
  telegramConfirmSchema,
};
