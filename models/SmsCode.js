import mongoose from 'mongoose';

/**
 * SmsCode Model
 * Stores SMS verification codes for phone number authentication
 */
const smsCodeSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    purpose: {
      type: String,
      enum: ['login', 'link_phone', 'verify'],
      default: 'login',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    platform: {
      type: String,
      enum: ['telegram', 'web', 'mobile_app'],
    },
    ip: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

smsCodeSchema.index({ phone: 1, purpose: 1 });
smsCodeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

smsCodeSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

smsCodeSchema.methods.hasAttemptsLeft = function() {
  return this.attempts < this.maxAttempts;
};

smsCodeSchema.methods.incrementAttempts = async function() {
  this.attempts += 1;
  await this.save();
  return this.hasAttemptsLeft();
};

smsCodeSchema.statics.generateCode = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

smsCodeSchema.statics.createForPhone = async function(phone, purpose = 'login', userId = null, platform = null) {
  await this.deleteMany({ phone, purpose, verified: false });
  
  const code = this.generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
  const smsCode = new this({
    phone,
    code,
    expiresAt,
    purpose,
    userId,
    platform,
  });
  
  await smsCode.save();
  return smsCode;
};

smsCodeSchema.statics.verifyCode = async function(phone, code, purpose = 'login') {
  const smsCode = await this.findOne({
    phone,
    purpose,
    verified: false,
  }).sort({ createdAt: -1 });
  
  if (!smsCode) {
    return { success: false, error: 'code_not_found' };
  }
  
  if (smsCode.isExpired()) {
    return { success: false, error: 'code_expired' };
  }
  
  if (!smsCode.hasAttemptsLeft()) {
    return { success: false, error: 'max_attempts_exceeded' };
  }
  
  if (smsCode.code !== code) {
    await smsCode.incrementAttempts();
    return { 
      success: false, 
      error: 'invalid_code',
      attemptsLeft: smsCode.maxAttempts - smsCode.attempts,
    };
  }
  
  smsCode.verified = true;
  await smsCode.save();
  
  return { success: true, smsCode };
};

export default mongoose.model('SmsCode', smsCodeSchema);
