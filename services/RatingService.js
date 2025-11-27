import mongoose from 'mongoose';
import ContactEvent from '../models/ContactEvent.js';
import AdFeedback from '../models/AdFeedback.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import SellerProfile from '../models/SellerProfile.js';

const FRAUD_THRESHOLDS = {
  suspiciousMinVotes: 3,
  suspiciousMaxAvg: 2.5,
  fraudFlagsThreshold: 2,
  autoHideMinVotes: 5,
  autoHideMaxAvg: 2.0,
  sellerFraudFlagsThreshold: 3,
  sellerLowScoreThreshold: 5,
};

class RatingService {
  async logContact(adId, sellerId, sellerTelegramId, buyerId, buyerTelegramId, channel) {
    try {
      const contact = new ContactEvent({
        adId,
        sellerId,
        sellerTelegramId,
        buyerId: buyerId || null,
        buyerTelegramId: buyerTelegramId || null,
        channel,
      });
      
      await contact.save();
      
      await Ad.findByIdAndUpdate(adId, {
        $inc: { contactClicks: 1, contactRevealCount: 1 },
      });
      
      return contact;
    } catch (error) {
      console.error('[RatingService] Error logging contact:', error);
      throw error;
    }
  }
  
  async submitFeedback(adId, sellerId, sellerTelegramId, buyerId, buyerTelegramId, contactId, score, reasonCode, comment) {
    try {
      const contact = await ContactEvent.findById(contactId);
      if (!contact) {
        throw new Error('Contact event not found');
      }
      
      if (contact.adId.toString() !== adId.toString()) {
        throw new Error('Contact event does not match ad');
      }
      
      const canSubmit = await AdFeedback.canSubmitFeedback(adId, buyerId, buyerTelegramId);
      if (!canSubmit) {
        throw new Error('Feedback already submitted for this ad');
      }
      
      if (score <= 3 && !reasonCode) {
        throw new Error('Reason code required for low scores');
      }
      
      const feedback = new AdFeedback({
        adId,
        sellerId,
        sellerTelegramId,
        buyerId: buyerId || null,
        buyerTelegramId: buyerTelegramId || null,
        contactId,
        score,
        reasonCode: score <= 3 ? reasonCode : null,
        comment: comment || null,
      });
      
      await feedback.save();
      
      await ContactEvent.findByIdAndUpdate(contactId, {
        feedbackSubmitted: true,
        feedbackId: feedback._id,
      });
      
      await this.updateAdRating(adId, score);
      await this.updateSellerRating(sellerId, score, reasonCode);
      
      await this.checkSuspiciousActivity(adId, sellerId);
      
      return feedback;
    } catch (error) {
      console.error('[RatingService] Error submitting feedback:', error);
      throw error;
    }
  }
  
  async updateAdRating(adId, newScore) {
    try {
      const ad = await Ad.findById(adId);
      if (!ad) return;
      
      const currentAvg = ad.ratingSummary?.avgScore || 0;
      const currentVotes = ad.ratingSummary?.totalVotes || 0;
      
      const newAvg = (currentAvg * currentVotes + newScore) / (currentVotes + 1);
      
      await Ad.findByIdAndUpdate(adId, {
        $set: {
          'ratingSummary.avgScore': Math.round(newAvg * 10) / 10,
          'ratingSummary.lastRatedAt': new Date(),
        },
        $inc: {
          'ratingSummary.totalVotes': 1,
        },
      });
    } catch (error) {
      console.error('[RatingService] Error updating ad rating:', error);
    }
  }
  
  async updateSellerRating(sellerId, newScore, reasonCode) {
    try {
      const user = await User.findById(sellerId);
      if (!user) return;
      
      const currentAvg = user.sellerRating?.avgScore || 0;
      const currentVotes = user.sellerRating?.totalVotes || 0;
      
      const newAvg = (currentAvg * currentVotes + newScore) / (currentVotes + 1);
      
      const updates = {
        $set: {
          'sellerRating.avgScore': Math.round(newAvg * 10) / 10,
          'sellerRating.lastRatedAt': new Date(),
        },
        $inc: {
          'sellerRating.totalVotes': 1,
        },
      };
      
      if (newScore <= 2) {
        updates.$inc['sellerRating.lowScoreCount'] = 1;
      }
      
      if (reasonCode === 'fake') {
        updates.$inc['sellerRating.fraudFlags'] = 1;
      }
      
      await User.findByIdAndUpdate(sellerId, updates);
      
      const sellerProfile = await SellerProfile.findOne({ userId: sellerId });
      if (sellerProfile) {
        await sellerProfile.updateRating();
      }
    } catch (error) {
      console.error('[RatingService] Error updating seller rating:', error);
    }
  }
  
  async checkSuspiciousActivity(adId, sellerId) {
    try {
      const ad = await Ad.findById(adId);
      if (!ad) return;
      
      const avgScore = ad.ratingSummary?.avgScore || 0;
      const totalVotes = ad.ratingSummary?.totalVotes || 0;
      
      const adStats = await AdFeedback.getAdStats(adId);
      const fraudFlags = adStats.reasons?.fake || 0;
      
      let isSuspicious = false;
      let suspiciousReason = null;
      
      if (totalVotes >= FRAUD_THRESHOLDS.suspiciousMinVotes && avgScore <= FRAUD_THRESHOLDS.suspiciousMaxAvg) {
        isSuspicious = true;
        suspiciousReason = 'low_rating';
      }
      
      if (fraudFlags >= FRAUD_THRESHOLDS.fraudFlagsThreshold) {
        isSuspicious = true;
        suspiciousReason = 'fraud_reports';
      }
      
      if (isSuspicious) {
        await Ad.findByIdAndUpdate(adId, {
          $set: {
            'flags.suspicious': true,
            'flags.suspiciousReason': suspiciousReason,
            'flags.markedAt': new Date(),
          },
        });
        
        console.log(`[RatingService] Ad ${adId} marked as suspicious: ${suspiciousReason}`);
      }
      
      if (totalVotes >= FRAUD_THRESHOLDS.autoHideMinVotes && avgScore <= FRAUD_THRESHOLDS.autoHideMaxAvg) {
        await Ad.findByIdAndUpdate(adId, {
          $set: {
            status: 'hidden',
            moderationStatus: 'pending',
          },
        });
        
        console.log(`[RatingService] Ad ${adId} auto-hidden due to very low rating`);
      }
    } catch (error) {
      console.error('[RatingService] Error checking suspicious activity:', error);
    }
  }
  
  async getAdRatingSummary(adId) {
    try {
      const ad = await Ad.findById(adId).select('ratingSummary').lean();
      if (!ad) return null;
      
      const detailedStats = await AdFeedback.getAdStats(adId);
      
      return {
        avgScore: ad.ratingSummary?.avgScore || 0,
        totalVotes: ad.ratingSummary?.totalVotes || 0,
        lastRatedAt: ad.ratingSummary?.lastRatedAt || null,
        distribution: detailedStats.distribution,
        reasons: detailedStats.reasons,
      };
    } catch (error) {
      console.error('[RatingService] Error getting ad rating summary:', error);
      return null;
    }
  }
  
  async getSellerRatingSummary(sellerId) {
    try {
      const user = await User.findById(sellerId).select('sellerRating').lean();
      if (!user) return null;
      
      const detailedStats = await AdFeedback.getSellerStats(sellerId);
      
      return {
        avgScore: user.sellerRating?.avgScore || 0,
        totalVotes: user.sellerRating?.totalVotes || 0,
        lowScoreCount: user.sellerRating?.lowScoreCount || 0,
        fraudFlags: user.sellerRating?.fraudFlags || 0,
        lastRatedAt: user.sellerRating?.lastRatedAt || null,
        reasons: detailedStats.reasons,
      };
    } catch (error) {
      console.error('[RatingService] Error getting seller rating summary:', error);
      return null;
    }
  }
  
  async getPendingFeedbackForUser(buyerId, buyerTelegramId) {
    try {
      return await ContactEvent.findPendingFeedback(buyerId, buyerTelegramId, 5);
    } catch (error) {
      console.error('[RatingService] Error getting pending feedback:', error);
      return [];
    }
  }
  
  async getSuspiciousAds(limit = 50) {
    try {
      const suspiciousAds = await AdFeedback.getSuspiciousAds(limit);
      
      const adIds = suspiciousAds.map(s => s._id);
      const ads = await Ad.find({ _id: { $in: adIds } })
        .select('title photos previewUrl price currency sellerTelegramId status')
        .lean();
      
      const adsMap = new Map(ads.map(ad => [ad._id.toString(), ad]));
      
      return suspiciousAds.map(stat => ({
        ...stat,
        ad: adsMap.get(stat._id.toString()) || null,
      }));
    } catch (error) {
      console.error('[RatingService] Error getting suspicious ads:', error);
      return [];
    }
  }
  
  async getSuspiciousSellers(limit = 50) {
    try {
      const suspiciousSellers = await AdFeedback.getSuspiciousSellers(limit);
      
      const sellerIds = suspiciousSellers.map(s => s._id);
      const users = await User.find({ _id: { $in: sellerIds } })
        .select('telegramId username firstName lastName')
        .lean();
      
      const usersMap = new Map(users.map(u => [u._id.toString(), u]));
      
      return suspiciousSellers.map(stat => ({
        ...stat,
        seller: usersMap.get(stat._id.toString()) || null,
      }));
    } catch (error) {
      console.error('[RatingService] Error getting suspicious sellers:', error);
      return [];
    }
  }
  
  async getFraudAnalytics(days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const dailyStats = await AdFeedback.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            },
            totalFeedback: { $sum: 1 },
            avgScore: { $avg: '$score' },
            lowScores: { $sum: { $cond: [{ $lte: ['$score', 2] }, 1, 0] } },
            fraudReports: { $sum: { $cond: [{ $eq: ['$reasonCode', 'fake'] }, 1, 0] } },
          },
        },
        {
          $sort: { '_id.date': 1 },
        },
      ]);
      
      const reasonDistribution = await AdFeedback.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            reasonCode: { $ne: null },
          },
        },
        {
          $group: {
            _id: '$reasonCode',
            count: { $sum: 1 },
          },
        },
      ]);
      
      const scoreDistribution = await AdFeedback.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$score',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
      
      return {
        dailyStats: dailyStats.map(d => ({
          date: d._id.date,
          totalFeedback: d.totalFeedback,
          avgScore: Math.round(d.avgScore * 10) / 10,
          lowScores: d.lowScores,
          fraudReports: d.fraudReports,
        })),
        reasonDistribution: reasonDistribution.reduce((acc, r) => {
          acc[r._id] = r.count;
          return acc;
        }, {}),
        scoreDistribution: scoreDistribution.reduce((acc, s) => {
          acc[s._id] = s.count;
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error('[RatingService] Error getting fraud analytics:', error);
      return null;
    }
  }
  
  async recalculateAdRating(adId) {
    try {
      const stats = await AdFeedback.getAdStats(adId);
      
      await Ad.findByIdAndUpdate(adId, {
        $set: {
          'ratingSummary.avgScore': stats.avgScore,
          'ratingSummary.totalVotes': stats.totalVotes,
        },
      });
      
      return stats;
    } catch (error) {
      console.error('[RatingService] Error recalculating ad rating:', error);
      return null;
    }
  }
  
  async recalculateSellerRating(sellerId) {
    try {
      const stats = await AdFeedback.getSellerStats(sellerId);
      
      await User.findByIdAndUpdate(sellerId, {
        $set: {
          'sellerRating.avgScore': stats.avgScore,
          'sellerRating.totalVotes': stats.totalVotes,
          'sellerRating.lowScoreCount': stats.lowScoreCount,
          'sellerRating.fraudFlags': stats.fraudFlags,
        },
      });
      
      return stats;
    } catch (error) {
      console.error('[RatingService] Error recalculating seller rating:', error);
      return null;
    }
  }
}

export default new RatingService();
