import { Router } from 'express';
import { z } from 'zod';
import DeviceToken from '../../../models/DeviceToken.js';
import { mobileAuth } from '../middleware/mobileAuth.js';
import { validateBody } from '../middleware/validate.js';
import { sendSuccess, handleRouteError } from '../utils/response.js';

const router = Router();

const registerSchema = z.object({
  deviceId: z.string().min(3),
  pushToken: z.string().min(3),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string().optional(),
});

router.post('/register', mobileAuth, validateBody(registerSchema), async (req, res) => {
  try {
    const payload = req.validatedBody;
    const device = await DeviceToken.findOneAndUpdate(
      { deviceId: payload.deviceId },
      {
        ...payload,
        user: req.currentUser._id,
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return sendSuccess(res, { id: device._id });
  } catch (error) {
    return handleRouteError(res, error, 'PUSH_REGISTER_FAILED');
  }
});

export default router;
