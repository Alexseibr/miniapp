import { Router } from 'express';
import Subscription from '../../models/Subscription.js';

const router = Router();

function parseTelegramId(raw) {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

router.get('/', async (req, res) => {
  try {
    const telegramId = parseTelegramId(req.query.telegramId);
    
    if (!telegramId) {
      return res.status(400).json({ error: 'Необходимо указать telegramId' });
    }

    const subscriptions = await Subscription.find({
      userTelegramId: telegramId,
    }).sort({ createdAt: -1 });

    res.json({ items: subscriptions });
  } catch (error) {
    console.error('GET /api/subscriptions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { telegramId, filters } = req.body;
    
    const parsedTelegramId = parseTelegramId(telegramId);
    if (!parsedTelegramId) {
      return res.status(400).json({ error: 'Необходимо указать корректный telegramId' });
    }

    if (!filters || typeof filters !== 'object') {
      return res.status(400).json({ error: 'Необходимо указать фильтры' });
    }

    const subscription = await Subscription.create({
      userTelegramId: parsedTelegramId,
      filters,
      isActive: true,
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error('POST /api/subscriptions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, telegramId } = req.body;

    const parsedTelegramId = parseTelegramId(telegramId);
    if (!parsedTelegramId) {
      return res.status(400).json({ error: 'Необходимо указать корректный telegramId' });
    }

    const subscription = await Subscription.findOne({
      _id: id,
      userTelegramId: parsedTelegramId,
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Подписка не найдена' });
    }

    if (typeof isActive === 'boolean') {
      subscription.isActive = isActive;
    }

    await subscription.save();
    res.json(subscription);
  } catch (error) {
    console.error('PATCH /api/subscriptions/:id error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const telegramId = parseTelegramId(req.query.telegramId);

    if (!telegramId) {
      return res.status(400).json({ error: 'Необходимо указать telegramId' });
    }

    const subscription = await Subscription.findOneAndDelete({
      _id: id,
      userTelegramId: telegramId,
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Подписка не найдена' });
    }

    res.json({ message: 'Подписка удалена', id });
  } catch (error) {
    console.error('DELETE /api/subscriptions/:id error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
