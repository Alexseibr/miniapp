import Category from '../models/Category.js';
import CategoryProposal from '../models/CategoryProposal.js';
import Ad from '../models/Ad.js';
import { normalizeAndTokenize } from '../utils/textTokenizer.js';

const MIN_ADS_FOR_PROPOSAL = 20;
const MIN_WORD_FREQUENCY = 5;
const TOP_KEYWORDS_COUNT = 10;

class CategoryEvolutionService {
  async analyzeOtherCategories() {
    console.log('[CategoryEvolution] Starting analysis of "Other" categories...');
    
    const otherCategories = await Category.find({ isOther: true, isActive: true });
    console.log(`[CategoryEvolution] Found ${otherCategories.length} "Other" categories to analyze`);
    
    const results = [];
    
    for (const otherCat of otherCategories) {
      try {
        const result = await this.analyzeOtherCategory(otherCat);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`[CategoryEvolution] Error analyzing ${otherCat.slug}:`, error.message);
      }
    }
    
    console.log(`[CategoryEvolution] Analysis complete. Created ${results.length} proposals`);
    return results;
  }

  async analyzeOtherCategory(otherCategory) {
    const ads = await Ad.find({
      subcategoryId: otherCategory.slug,
      needsCategoryReview: true,
      status: 'active',
      moderationStatus: 'approved',
    }).select('_id title description').lean();

    console.log(`[CategoryEvolution] Category "${otherCategory.name}": ${ads.length} ads with needsCategoryReview`);

    if (ads.length < MIN_ADS_FOR_PROPOSAL) {
      console.log(`[CategoryEvolution] Not enough ads (${ads.length} < ${MIN_ADS_FOR_PROPOSAL}), skipping`);
      return null;
    }

    const wordFrequency = new Map();
    
    for (const ad of ads) {
      const text = `${ad.title || ''} ${ad.description || ''}`;
      const tokens = normalizeAndTokenize(text);
      
      const uniqueTokens = [...new Set(tokens)];
      
      for (const token of uniqueTokens) {
        if (token.length >= 3) {
          const current = wordFrequency.get(token) || { count: 0, adIds: [] };
          current.count++;
          current.adIds.push(ad._id);
          wordFrequency.set(token, current);
        }
      }
    }

    const sortedWords = Array.from(wordFrequency.entries())
      .filter(([_, data]) => data.count >= MIN_WORD_FREQUENCY)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, TOP_KEYWORDS_COUNT);

    if (sortedWords.length === 0) {
      console.log(`[CategoryEvolution] No significant keywords found for "${otherCategory.name}"`);
      return null;
    }

    const topKeyword = sortedWords[0];
    const suggestedName = this.capitalizeFirst(topKeyword[0]);
    const suggestedSlug = this.generateSlug(topKeyword[0], otherCategory.parentSlug);

    const existingProposal = await CategoryProposal.findOne({
      parentCategorySlug: otherCategory.parentSlug,
      suggestedSlug: suggestedSlug,
      status: 'pending',
    });

    if (existingProposal) {
      existingProposal.matchedAdsCount = topKeyword[1].count;
      existingProposal.matchedAdIds = topKeyword[1].adIds;
      existingProposal.keywordsSample = sortedWords.map(([word]) => word);
      await existingProposal.save();
      console.log(`[CategoryEvolution] Updated existing proposal for "${suggestedName}"`);
      return existingProposal;
    }

    const parentCategory = await Category.findOne({ slug: otherCategory.parentSlug });
    if (!parentCategory) {
      console.log(`[CategoryEvolution] Parent category not found: ${otherCategory.parentSlug}`);
      return null;
    }

    const proposal = new CategoryProposal({
      parentCategoryId: parentCategory._id,
      parentCategorySlug: otherCategory.parentSlug,
      suggestedSlug,
      suggestedName,
      keywordsSample: sortedWords.map(([word]) => word),
      matchedAdsCount: topKeyword[1].count,
      matchedAdIds: topKeyword[1].adIds,
      status: 'pending',
    });

    await proposal.save();
    console.log(`[CategoryEvolution] Created new proposal: "${suggestedName}" (${topKeyword[1].count} ads)`);
    
    return proposal;
  }

  async approveProposal(proposalId, adminId, options = {}) {
    const proposal = await CategoryProposal.findById(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }
    
    if (proposal.status !== 'pending') {
      throw new Error(`Proposal already ${proposal.status}`);
    }

    const parentCategory = await Category.findById(proposal.parentCategoryId);
    if (!parentCategory) {
      throw new Error('Parent category not found');
    }

    const otherCategory = await Category.findOne({
      parentSlug: proposal.parentCategorySlug,
      isOther: true,
    });

    const maxSortOrder = await Category.findOne({ parentSlug: proposal.parentCategorySlug })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean();

    const newCategory = new Category({
      slug: options.slug || proposal.suggestedSlug,
      name: options.name || proposal.suggestedName,
      parentSlug: proposal.parentCategorySlug,
      level: parentCategory.level + 1,
      isLeaf: true,
      isOther: false,
      isActive: true,
      sortOrder: (maxSortOrder?.sortOrder || 0) + 1,
      type: parentCategory.type,
      keywordTokens: proposal.keywordsSample.slice(0, 5),
      autoGenerated: true,
      minAdsThreshold: options.minAdsThreshold || 5,
      visibilityScope: options.visibilityScope || 'all',
    });

    await newCategory.save();

    const updateResult = await Ad.updateMany(
      { _id: { $in: proposal.matchedAdIds } },
      {
        $set: {
          subcategoryId: newCategory.slug,
          needsCategoryReview: false,
        },
      }
    );

    proposal.status = 'approved';
    proposal.reviewedBy = adminId;
    proposal.reviewedAt = new Date();
    proposal.createdCategoryId = newCategory._id;
    proposal.notes = options.notes || null;
    await proposal.save();

    console.log(`[CategoryEvolution] Proposal approved: "${newCategory.name}". ${updateResult.modifiedCount} ads moved.`);

    return {
      proposal,
      newCategory,
      movedAdsCount: updateResult.modifiedCount,
    };
  }

  async rejectProposal(proposalId, adminId, reason = null) {
    const proposal = await CategoryProposal.findById(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }
    
    if (proposal.status !== 'pending') {
      throw new Error(`Proposal already ${proposal.status}`);
    }

    proposal.status = 'rejected';
    proposal.reviewedBy = adminId;
    proposal.reviewedAt = new Date();
    proposal.notes = reason;
    await proposal.save();

    console.log(`[CategoryEvolution] Proposal rejected: "${proposal.suggestedName}"`);
    return proposal;
  }

  async getPendingProposals() {
    return CategoryProposal.find({ status: 'pending' })
      .sort({ matchedAdsCount: -1, createdAt: -1 })
      .populate('parentCategoryId', 'name slug icon3d')
      .lean();
  }

  async getProposalWithAds(proposalId) {
    const proposal = await CategoryProposal.findById(proposalId)
      .populate('parentCategoryId', 'name slug icon3d')
      .lean();

    if (!proposal) {
      return null;
    }

    const ads = await Ad.find({ _id: { $in: proposal.matchedAdIds } })
      .select('title description price photos city createdAt')
      .limit(50)
      .lean();

    return { proposal, ads };
  }

  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  generateSlug(keyword, parentSlug) {
    const translitMap = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    };

    const slug = keyword
      .toLowerCase()
      .split('')
      .map(char => translitMap[char] || char)
      .join('')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${parentSlug}-${slug}`;
  }

  async getStats() {
    const otherCategories = await Category.find({ isOther: true }).select('slug parentSlug');
    
    const stats = [];
    
    for (const otherCat of otherCategories) {
      const count = await Ad.countDocuments({
        subcategoryId: otherCat.slug,
        needsCategoryReview: true,
      });
      
      if (count > 0) {
        stats.push({
          categorySlug: otherCat.parentSlug,
          otherSlug: otherCat.slug,
          adsCount: count,
        });
      }
    }
    
    return stats.sort((a, b) => b.adsCount - a.adsCount);
  }
}

export default new CategoryEvolutionService();
