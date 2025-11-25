import CategoryWordStats from '../models/CategoryWordStats.js';
import { getUniqueTokens } from '../utils/textTokenizer.js';

class CategoryWordStatsService {
  async updateStatsForAd(ad) {
    if (!ad || !ad.categoryId) {
      return { updated: false, reason: 'Missing ad or categoryId' };
    }

    const text = `${ad.title || ''} ${ad.description || ''}`.trim();
    if (!text || text.length < 3) {
      return { updated: false, reason: 'Text too short' };
    }

    const uniqueWords = getUniqueTokens(text);
    if (!uniqueWords.length) {
      return { updated: false, reason: 'No valid tokens found' };
    }

    const bulkOps = uniqueWords.map(word => ({
      updateOne: {
        filter: { categoryId: ad.categoryId, word },
        update: {
          $inc: { count: 1 },
          $set: { 
            lastUpdatedAt: new Date(),
            subcategoryId: ad.subcategoryId || null,
          },
        },
        upsert: true,
      },
    }));

    try {
      const result = await CategoryWordStats.bulkWrite(bulkOps, { ordered: false });
      return {
        updated: true,
        wordsProcessed: uniqueWords.length,
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
      };
    } catch (error) {
      console.error('[CategoryWordStats] Error updating stats:', error.message);
      return { updated: false, reason: error.message };
    }
  }

  async suggestByStats(text, limit = 3) {
    const uniqueWords = getUniqueTokens(text);
    
    if (!uniqueWords.length) {
      return { bestMatch: null, suggestions: [] };
    }

    const stats = await CategoryWordStats.find({
      word: { $in: uniqueWords },
    }).lean();

    if (!stats.length) {
      return { bestMatch: null, suggestions: [] };
    }

    const scoreByCategory = new Map();

    for (const s of stats) {
      const key = s.categoryId.toString();
      const wordWeight = Math.log(1 + s.count);
      const prev = scoreByCategory.get(key) || { score: 0, subcategoryId: null };
      scoreByCategory.set(key, {
        score: prev.score + wordWeight,
        subcategoryId: s.subcategoryId || prev.subcategoryId,
      });
    }

    const scoredCategories = Array.from(scoreByCategory.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        subcategoryId: data.subcategoryId?.toString() || null,
        score: data.score,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (!scoredCategories.length) {
      return { bestMatch: null, suggestions: [] };
    }

    const totalScore = scoredCategories.reduce((acc, s) => acc + s.score, 0);
    const best = scoredCategories[0];
    const confidence = best.score / totalScore;

    return {
      bestMatch: {
        categoryId: best.categoryId,
        subcategoryId: best.subcategoryId,
        confidence,
        score: best.score,
        source: 'stats',
      },
      suggestions: scoredCategories.map(s => ({
        categoryId: s.categoryId,
        subcategoryId: s.subcategoryId,
        score: s.score,
        source: 'stats',
      })),
    };
  }

  async cleanupOldStats(minCount = 2, maxAgeDays = 90) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - maxAgeDays);

    try {
      const result = await CategoryWordStats.deleteMany({
        count: { $lte: minCount },
        lastUpdatedAt: { $lt: thresholdDate },
      });

      console.log(`[CategoryWordStats] Cleanup: removed ${result.deletedCount} old/low-count entries`);
      return { deleted: result.deletedCount };
    } catch (error) {
      console.error('[CategoryWordStats] Cleanup error:', error.message);
      return { deleted: 0, error: error.message };
    }
  }

  async getStatsOverview() {
    const pipeline = [
      {
        $group: {
          _id: '$categoryId',
          totalWords: { $sum: 1 },
          totalCount: { $sum: '$count' },
          avgCount: { $avg: '$count' },
        },
      },
      { $sort: { totalCount: -1 } },
      { $limit: 20 },
    ];

    const stats = await CategoryWordStats.aggregate(pipeline);
    const totalDocuments = await CategoryWordStats.countDocuments();

    return {
      totalDocuments,
      topCategories: stats,
    };
  }
}

export default new CategoryWordStatsService();
