import { Router } from 'express';
import { z } from 'zod';
import { mobileAuth } from '../middleware/mobileAuth.js';
import { validateBody } from '../middleware/validate.js';
import { sendSuccess, handleRouteError } from '../utils/response.js';
import { formatUserProfile } from '../utils/user.js';

const router = Router();

const updateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  avatar: z.string().url().optional(),
  preferredCity: z.string().optional(),
  notificationSettings: z
    .object({
      push: z.boolean().optional(),
      email: z.boolean().optional(),
      telegram: z.boolean().optional(),
    })
    .optional(),
});

router.use(mobileAuth);

router.get('/me', (req, res) => {
  return sendSuccess(res, formatUserProfile(req.currentUser));
});

router.patch('/me', validateBody(updateSchema), async (req, res) => {
  try {
    const updates = req.validatedBody;
    Object.assign(req.currentUser, updates);
    await req.currentUser.save();
    return sendSuccess(res, formatUserProfile(req.currentUser));
  } catch (error) {
    return handleRouteError(res, error, 'USER_UPDATE_FAILED');
  }
});

export default router;
