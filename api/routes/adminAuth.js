import express from 'express';
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

export default router;
