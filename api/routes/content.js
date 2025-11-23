import { Router } from 'express';
import ContentSlot from '../../models/ContentSlot.js';

const router = Router();

router.get('/slot/:slotId', async (req, res, next) => {
  try {
    const { slotId } = req.params;

    if (!slotId) {
      return res.status(400).json({ error: 'slotId is required' });
    }

    const slot = await ContentSlot.findOne({
      slotId: slotId.toLowerCase().trim(),
      isActive: true,
    }).lean();

    if (!slot) {
      return res.status(404).json({
        error: 'Content slot not found',
        slotId,
      });
    }

    return res.json(slot);
  } catch (error) {
    next(error);
  }
});

router.get('/slots', async (req, res, next) => {
  try {
    const { isActive = 'true' } = req.query;

    const query = {};

    if (isActive === 'true') {
      query.isActive = true;
    }

    const slots = await ContentSlot.find(query).lean();

    return res.json({
      slots,
      total: slots.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
