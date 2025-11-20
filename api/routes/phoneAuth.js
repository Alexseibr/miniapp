const express = require('express');
const SmsLoginCode = require('../../models/SmsLoginCode');
const User = require('../../models/User');
const { formatUser } = require('../../utils/formatUser');
const { buildAccessToken } = require('../../utils/jwt');
const { validate } = require('../middleware/validate');
const { requestCodeSchema, smsLoginSchema } = require('../validation/authSchemas');

const router = express.Router();

function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone)
    .trim()
    .replace(/[^+\d]/g, '')
    .replace(/^8/, '+7');
}

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

router.post('/sms/requestCode', validate(requestCodeSchema), async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.body.phone);

    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Укажите номер телефона' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await SmsLoginCode.create({ phone: normalizedPhone, code, expiresAt });

    return res.json({ ok: true, code });
  } catch (error) {
    console.error('requestCode error', error);
    return res.status(500).json({ message: 'Не удалось отправить код' });
  }
});

router.post('/sms/login', validate(smsLoginSchema), async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.body.phone);
    const code = String(req.body.code || '').trim();

    if (!normalizedPhone || !code) {
      return res.status(400).json({ message: 'Телефон и код обязательны' });
    }

    const loginCode = await SmsLoginCode.findOne({ phone: normalizedPhone, code })
      .sort({ createdAt: -1 })
      .lean();

    if (!loginCode || !loginCode.expiresAt || loginCode.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Код неверен или истёк' });
    }

    let user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      user = await User.create({ phone: normalizedPhone });
    }

    const token = buildAccessToken(user);

    await SmsLoginCode.deleteMany({ phone: normalizedPhone });

    return res.json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('login error', error);
    return res.status(500).json({ message: 'Не удалось выполнить вход' });
  }
});

module.exports = router;
