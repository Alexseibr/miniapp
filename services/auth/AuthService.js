/**
 * Authentication Service
 * Handles multi-platform authentication and account merging
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import SmsCode from '../../models/SmsCode.js';
import Ad from '../../models/Ad.js';

const getJwtSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET environment variable must be set with at least 32 characters');
  }
  return secret;
};
const JWT_EXPIRES_IN = '30d';

class AuthService {
  /**
   * Verify Telegram initData signature
   */
  verifyTelegramInitData(initData, botToken) {
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      urlParams.delete('hash');
      
      const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();
      
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
      
      return hash === calculatedHash;
    } catch (error) {
      console.error('[AuthService] verifyTelegramInitData error:', error);
      return false;
    }
  }

  /**
   * Parse Telegram initData
   */
  parseTelegramInitData(initData) {
    try {
      const urlParams = new URLSearchParams(initData);
      const userJson = urlParams.get('user');
      
      if (!userJson) {
        return null;
      }
      
      const user = JSON.parse(userJson);
      return {
        telegramId: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        languageCode: user.language_code,
        isPremium: user.is_premium,
        photoUrl: user.photo_url,
        authDate: parseInt(urlParams.get('auth_date') || '0', 10),
        hash: urlParams.get('hash'),
        queryId: urlParams.get('query_id'),
        startParam: urlParams.get('start_param'),
      };
    } catch (error) {
      console.error('[AuthService] parseTelegramInitData error:', error);
      return null;
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user._id.toString(),
      telegramId: user.telegramId,
      phone: user.phone,
      role: user.role,
    };
    
    return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, getJwtSecret());
    } catch (error) {
      return null;
    }
  }

  /**
   * Authenticate via Telegram initData
   */
  async authenticateTelegram(initData, phone = null) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!this.verifyTelegramInitData(initData, botToken)) {
      return { success: false, error: 'invalid_init_data' };
    }
    
    const telegramData = this.parseTelegramInitData(initData);
    if (!telegramData || !telegramData.telegramId) {
      return { success: false, error: 'invalid_telegram_data' };
    }
    
    const { telegramId, username, firstName, lastName } = telegramData;
    
    let user = await User.findOne({ telegramId });
    
    if (user) {
      user.username = username || user.username;
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.lastActiveAt = new Date();
      
      if (!user.authProviders.some(p => p.type === 'telegram')) {
        user.authProviders.push({ type: 'telegram', providerId: telegramId.toString() });
      }
      
      await user.save();
    } else if (phone) {
      user = await User.findOne({ phone, phoneVerified: true });
      
      if (user) {
        user.telegramId = telegramId;
        user.username = username || user.username;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        
        if (!user.authProviders.some(p => p.type === 'telegram')) {
          user.authProviders.push({ type: 'telegram', providerId: telegramId.toString() });
        }
        
        await user.save();
      } else {
        user = await User.create({
          telegramId,
          username,
          firstName,
          lastName,
          phone,
          phoneVerified: true,
          authProviders: [
            { type: 'telegram', providerId: telegramId.toString() },
            { type: 'sms', providerId: phone },
          ],
        });
      }
    } else {
      user = await User.create({
        telegramId,
        username,
        firstName,
        lastName,
        phoneVerified: false,
        authProviders: [{ type: 'telegram', providerId: telegramId.toString() }],
      });
    }
    
    const token = this.generateToken(user);
    
    return {
      success: true,
      token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Request SMS code for authentication
   */
  async requestSmsCode(phone, purpose = 'login', userId = null, platform = null) {
    const normalizedPhone = this.normalizePhone(phone);
    
    if (!this.isValidPhone(normalizedPhone)) {
      return { success: false, error: 'invalid_phone' };
    }
    
    const recentCode = await SmsCode.findOne({
      phone: normalizedPhone,
      purpose,
      verified: false,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });
    
    if (recentCode) {
      return { success: false, error: 'too_many_requests', retryAfter: 60 };
    }
    
    const smsCode = await SmsCode.createForPhone(normalizedPhone, purpose, userId, platform);
    
    await this.sendSms(normalizedPhone, smsCode.code);
    
    return {
      success: true,
      message: 'SMS code sent',
      expiresAt: smsCode.expiresAt,
      phone: normalizedPhone,
    };
  }

  /**
   * Verify SMS code and authenticate
   */
  async verifySmsCode(phone, code, platform = 'web') {
    const normalizedPhone = this.normalizePhone(phone);
    
    const result = await SmsCode.verifyCode(normalizedPhone, code, 'login');
    
    if (!result.success) {
      return result;
    }
    
    let user = await User.findOne({ phone: normalizedPhone });
    
    if (user) {
      if (!user.phoneVerified) {
        user.phoneVerified = true;
      }
      
      if (!user.authProviders.some(p => p.type === 'sms')) {
        user.authProviders.push({ type: 'sms', providerId: normalizedPhone });
      }
      
      user.lastActiveAt = new Date();
      await user.save();
    } else {
      const appUserId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      user = await User.create({
        phone: normalizedPhone,
        phoneVerified: true,
        appUserId,
        authProviders: [{ type: 'sms', providerId: normalizedPhone }],
      });
    }
    
    const token = this.generateToken(user);
    
    return {
      success: true,
      token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Link phone number to existing user (with account merging)
   */
  async linkPhone(userId, phone, code) {
    const normalizedPhone = this.normalizePhone(phone);
    
    const result = await SmsCode.verifyCode(normalizedPhone, code, 'link_phone');
    
    if (!result.success) {
      return result;
    }
    
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return { success: false, error: 'user_not_found' };
    }
    
    const existingPhoneUser = await User.findOne({ 
      phone: normalizedPhone, 
      phoneVerified: true,
      _id: { $ne: userId },
    });
    
    if (existingPhoneUser) {
      const mergedUser = await this.mergeUsers(currentUser, existingPhoneUser);
      const token = this.generateToken(mergedUser);
      
      return {
        success: true,
        token,
        user: this.sanitizeUser(mergedUser),
        merged: true,
        mergedFromId: currentUser._id.toString(),
      };
    }
    
    currentUser.phone = normalizedPhone;
    currentUser.phoneVerified = true;
    
    if (!currentUser.authProviders.some(p => p.type === 'sms')) {
      currentUser.authProviders.push({ type: 'sms', providerId: normalizedPhone });
    }
    
    await currentUser.save();
    const token = this.generateToken(currentUser);
    
    return {
      success: true,
      token,
      user: this.sanitizeUser(currentUser),
      merged: false,
    };
  }

  /**
   * Merge two user accounts
   * Moves all data from sourceUser to targetUser
   */
  async mergeUsers(sourceUser, targetUser) {
    console.log(`[AuthService] Merging user ${sourceUser._id} into ${targetUser._id}`);
    
    if (sourceUser.telegramId && !targetUser.telegramId) {
      targetUser.telegramId = sourceUser.telegramId;
    }
    if (sourceUser.appUserId && !targetUser.appUserId) {
      targetUser.appUserId = sourceUser.appUserId;
    }
    if (sourceUser.username && !targetUser.username) {
      targetUser.username = sourceUser.username;
    }
    if (sourceUser.firstName && !targetUser.firstName) {
      targetUser.firstName = sourceUser.firstName;
    }
    if (sourceUser.lastName && !targetUser.lastName) {
      targetUser.lastName = sourceUser.lastName;
    }
    
    for (const provider of sourceUser.authProviders) {
      if (!targetUser.authProviders.some(p => p.type === provider.type)) {
        targetUser.authProviders.push(provider);
      }
    }
    
    await Ad.updateMany(
      { userId: sourceUser._id },
      { $set: { userId: targetUser._id } }
    );
    await Ad.updateMany(
      { sellerId: sourceUser.telegramId },
      { $set: { sellerId: targetUser.telegramId || targetUser._id } }
    );
    
    const sourceFavorites = sourceUser.favorites || [];
    for (const fav of sourceFavorites) {
      if (!targetUser.favorites.some(f => f.adId.toString() === fav.adId.toString())) {
        targetUser.favorites.push(fav);
      }
    }
    targetUser.favoritesCount = targetUser.favorites.length;
    
    if (sourceUser.role === 'seller' && targetUser.role === 'user') {
      targetUser.role = 'seller';
    }
    if (sourceUser.role === 'admin' || sourceUser.role === 'moderator') {
      targetUser.role = sourceUser.role;
    }
    
    if (!targetUser.mergedFrom) {
      targetUser.mergedFrom = [];
    }
    targetUser.mergedFrom.push(sourceUser._id);
    
    sourceUser.mergedInto = targetUser._id;
    sourceUser.isActive = false;
    
    await sourceUser.save();
    await targetUser.save();
    
    console.log(`[AuthService] Merge complete: ${sourceUser._id} -> ${targetUser._id}`);
    
    return targetUser;
  }

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhone(phone) {
    let normalized = phone.replace(/\D/g, '');
    
    if (normalized.startsWith('80')) {
      normalized = '375' + normalized.slice(2);
    } else if (normalized.startsWith('8') && normalized.length === 11) {
      normalized = '7' + normalized.slice(1);
    }
    
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    
    return normalized;
  }

  /**
   * Validate phone number
   */
  isValidPhone(phone) {
    const normalized = phone.replace(/\D/g, '');
    return normalized.length >= 10 && normalized.length <= 15;
  }

  /**
   * Send SMS (stub - implement with real SMS provider)
   */
  async sendSms(phone, code) {
    console.log(`[AuthService] Sending SMS to ${phone}: ${code}`);
    
    return true;
  }

  /**
   * Sanitize user object for API response
   */
  sanitizeUser(user) {
    return {
      _id: user._id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      role: user.role,
      authProviders: user.authProviders.map(p => p.type),
      telegramLinked: !!user.telegramId,
      isActive: user.isActive,
      favoritesCount: user.favoritesCount,
      createdAt: user.createdAt,
    };
  }

  /**
   * Get user from token
   */
  async getUserFromToken(token) {
    const decoded = this.verifyToken(token);
    if (!decoded) {
      return null;
    }
    
    return User.findById(decoded.userId);
  }
}

export default new AuthService();
