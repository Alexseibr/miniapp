const { Router } = require('express');
const Ad = require('../../models/Ad.js');
const Order = require('../../models/Order.js');

const router = Router();

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
};

router.post(
  '/',
  handle(async (req, res) => {
    const { buyerTelegramId, buyerName, buyerUsername, buyerPhone, items, seasonCode, comment } =
      req.body;

    if (!buyerTelegramId) {
      return res.status(400).json({ message: 'buyerTelegramId обязателен' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Необходимо передать хотя бы один товар' });
    }

    const adIds = items.map((item) => item.adId).filter(Boolean);
    if (!adIds.length) {
      return res.status(400).json({ message: 'Каждый товар должен содержать adId' });
    }

    const ads = await Ad.find({ _id: { $in: adIds } }).lean();
    const adsMap = new Map(ads.map((ad) => [ad._id.toString(), ad]));

    const orderItems = [];

    for (const item of items) {
      const ad = adsMap.get(String(item.adId));
      if (!ad) {
        return res.status(400).json({ message: `Объявление ${item.adId} не найдено` });
      }

      const quantity = Number(item.quantity) || 1;

      orderItems.push({
        adId: ad._id,
        title: ad.title,
        quantity,
        price: ad.price,
        sellerTelegramId: ad.sellerTelegramId,
      });
    }

    const order = await Order.create({
      buyerTelegramId,
      buyerName,
      buyerUsername,
      buyerPhone,
      items: orderItems,
      seasonCode: seasonCode ?? null,
      comment,
    });

    res.status(201).json(order);
  })
);

router.get(
  '/:buyerTelegramId',
  handle(async (req, res) => {
    const buyerTelegramId = Number(req.params.buyerTelegramId);
    if (!buyerTelegramId) {
      return res.status(400).json({ message: 'Некорректный buyerTelegramId' });
    }

    const orders = await Order.find({ buyerTelegramId }).sort({ createdAt: -1 });
    res.json(orders);
  })
);

module.exports = router;
