const express = require('express');
const jwt = require('jsonwebtoken');
const LoginCode = require('../../models/LoginCode');
const User = require('../../models/User');

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

function buildToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/requestCode', async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.body?.phone);

    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Укажите номер телефона' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await LoginCode.create({ phone: normalizedPhone, code, expiresAt });

    return res.json({ ok: true, code });
  } catch (error) {
    console.error('requestCode error', error);
    return res.status(500).json({ message: 'Не удалось отправить код' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.body?.phone);
    const code = String(req.body?.code || '').trim();

    if (!normalizedPhone || !code) {
      return res.status(400).json({ message: 'Телефон и код обязательны' });
    }

    const loginCode = await LoginCode.findOne({ phone: normalizedPhone, code })
      .sort({ createdAt: -1 })
      .lean();

    if (!loginCode || !loginCode.expiresAt || loginCode.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Код неверен или истёк' });
    }

    let user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      user = await User.create({ phone: normalizedPhone });
    }

    const token = buildToken(user);

    await LoginCode.deleteMany({ phone: normalizedPhone });

    const userPayload = {
      _id: user._id,
      id: user._id,
      phone: user.phone,
      name: user.name || '',
      email: user.email || '',
      avatar: user.avatar || null,
      role: user.role,
    };

    return res.json({ token, user: userPayload });
  } catch (error) {
    console.error('login error', error);
    return res.status(500).json({ message: 'Не удалось выполнить вход' });
  }
});

module.exports = router;
