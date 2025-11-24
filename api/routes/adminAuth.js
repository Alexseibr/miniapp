import express from 'express';
import crypto from 'crypto';
import AdminLoginToken from '../../models/AdminLoginToken.js';
import User from '../../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// PUBLIC endpoint - not protected by adminAuth middleware
router.get('/verify-token', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: 'Токен не предоставлен' });
    }
    
    // Find token
    const loginToken = await AdminLoginToken.findOne({ 
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    }).populate('userId');
    
    if (!loginToken) {
      return res.status(400).json({ 
        message: 'Неверный или истекший токен' 
      });
    }
    
    const user = loginToken.userId;
    
    // Verify admin role (double-check)
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Доступ запрещен' 
      });
    }
    
    // Mark token as used
    loginToken.used = true;
    await loginToken.save();
    
    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user._id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return res.json({
      token: jwtToken,
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ message: 'Ошибка верификации' });
  }
});

// Telegram Login Widget auth
router.post('/telegram-login', async (req, res) => {
  try {
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body;
    
    // Validate hash (Telegram signature verification)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return res.status(500).json({ message: 'Конфигурация сервера неверна' });
    }
    
    // Build data check string - CRITICAL: Only include fields with actual values
    // Telegram never includes undefined/null fields in its signature
    const dataCheckString = Object.keys(req.body)
      .filter(key => key !== 'hash') // Exclude hash field
      .filter(key => req.body[key] !== undefined && req.body[key] !== null) // Exclude undefined/null
      .sort() // Alphabetical order
      .map(key => `${key}=${req.body[key]}`)
      .join('\n');
    
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    if (hmac !== hash) {
      console.error('HMAC validation failed');
      console.error('Expected hash:', hash);
      console.error('Computed hash:', hmac);
      console.error('Data check string:', dataCheckString);
      return res.status(400).json({ message: 'Неверная подпись данных' });
    }
    
    // Check auth_date (not older than 1 hour)
    const authTime = parseInt(auth_date);
    const now = Math.floor(Date.now() / 1000);
    if (now - authTime > 3600) {
      return res.status(400).json({ message: 'Срок действия авторизации истек' });
    }
    
    // Find user by telegramId
    const user = await User.findOne({ telegramId: id.toString() });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Verify admin role
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Доступ запрещен. Только администраторы могут войти.' 
      });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return res.json({
      token,
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
        firstName: user.firstName || first_name,
        lastName: user.lastName || last_name,
        username: user.username || username
      }
    });
    
  } catch (error) {
    console.error('Telegram login error:', error);
    return res.status(500).json({ message: 'Ошибка авторизации' });
  }
});

export default router;
