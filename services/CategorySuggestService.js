import Category from '../models/Category.js';
import { CATEGORY_KEYWORD_RULES } from '../config/categoryKeywordsConfig.js';
import CategoryWordStatsService from './CategoryWordStatsService.js';
import { normalizeText } from '../utils/textTokenizer.js';

const RULE_WEIGHT = 0.6;
const STATS_WEIGHT = 0.4;

class CategorySuggestService {
  normalize(text) {
    return normalizeText(text);
  }

  suggestCategoryByRules(text) {
    const normalized = this.normalize(text);
    
    if (!normalized || normalized.length < 2) {
      return { suggestions: [], bestMatch: null };
    }

    const scores = [];

    for (const rule of CATEGORY_KEYWORD_RULES) {
      let ruleScore = 0;
      const matchedKeywords = [];
      
      for (const kw of rule.keywords) {
        const normalizedKw = this.normalize(kw);
        if (normalized.includes(normalizedKw)) {
          ruleScore += rule.weight ?? 1;
          matchedKeywords.push(kw);
        }
      }
      
      if (ruleScore > 0) {
        scores.push({
          categorySlug: rule.categorySlug,
          subcategorySlug: rule.subcategorySlug,
          score: ruleScore,
          matchedKeywords,
          source: 'rules',
        });
      }
    }

    if (!scores.length) {
      return { suggestions: [], bestMatch: null };
    }

    scores.sort((a, b) => b.score - a.score);

    const seen = new Set();
    const uniqueScores = scores.filter(s => {
      const key = `${s.categorySlug}:${s.subcategorySlug || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const suggestions = uniqueScores.slice(0, 3).map((s) => ({
      categorySlug: s.categorySlug,
      subcategorySlug: s.subcategorySlug,
      score: s.score,
      matchedKeywords: s.matchedKeywords,
      source: 'rules',
    }));

    const best = suggestions[0];

    const totalScore = uniqueScores.reduce((acc, s) => acc + s.score, 0);
    const confidence = best.score / totalScore;

    return {
      bestMatch: {
        categorySlug: best.categorySlug,
        subcategorySlug: best.subcategorySlug,
        confidence,
        matchedKeywords: best.matchedKeywords,
        source: 'rules',
      },
      suggestions,
    };
  }

  async enrichWithCategoryData(result) {
    if (!result.bestMatch && !result.suggestions.length) {
      return {
        bestMatch: null,
        alternatives: [],
      };
    }

    const allSlugs = new Set();
    const allIds = new Set();

    const collectFromItem = (item) => {
      if (item.categorySlug) allSlugs.add(item.categorySlug);
      if (item.subcategorySlug) allSlugs.add(item.subcategorySlug);
      if (item.categoryId) allIds.add(item.categoryId);
      if (item.subcategoryId) allIds.add(item.subcategoryId);
    };

    if (result.bestMatch) collectFromItem(result.bestMatch);
    for (const s of result.suggestions) collectFromItem(s);

    const queries = [];
    if (allSlugs.size > 0) {
      queries.push(Category.find({ slug: { $in: Array.from(allSlugs) } }).lean());
    }
    if (allIds.size > 0) {
      queries.push(Category.find({ _id: { $in: Array.from(allIds) } }).lean());
    }

    const results = await Promise.all(queries);
    const categories = results.flat();
    
    const categoryMap = new Map();
    for (const cat of categories) {
      categoryMap.set(cat.slug, cat);
      categoryMap.set(cat._id.toString(), cat);
    }

    const parentSlugs = new Set();
    for (const cat of categories) {
      if (cat.parentSlug) {
        parentSlugs.add(cat.parentSlug);
      }
    }
    
    if (parentSlugs.size > 0) {
      const parentCategories = await Category.find({ slug: { $in: Array.from(parentSlugs) } }).lean();
      for (const cat of parentCategories) {
        categoryMap.set(cat.slug, cat);
        categoryMap.set(cat._id.toString(), cat);
      }
    }

    const enrichSuggestion = (s) => {
      let mainCat = null;
      let subCat = null;

      if (s.categorySlug) {
        mainCat = categoryMap.get(s.categorySlug);
      } else if (s.categoryId) {
        mainCat = categoryMap.get(s.categoryId);
      }

      if (s.subcategorySlug) {
        subCat = categoryMap.get(s.subcategorySlug);
      } else if (s.subcategoryId) {
        subCat = categoryMap.get(s.subcategoryId);
      }
      
      let parentCat = null;
      if (subCat && subCat.parentSlug) {
        parentCat = categoryMap.get(subCat.parentSlug);
      }
      
      const actualParent = parentCat || mainCat;
      const actualChild = subCat && subCat.slug !== mainCat?.slug ? subCat : null;

      return {
        categoryId: actualParent?._id?.toString() || null,
        categoryName: actualParent?.name || s.categorySlug || 'Неизвестно',
        categorySlug: actualParent?.slug || s.categorySlug || null,
        subcategoryId: actualChild?._id?.toString() || null,
        subcategoryName: actualChild?.name || null,
        subcategorySlug: actualChild?.slug || null,
        score: s.score,
        confidence: s.confidence,
        matchedKeywords: s.matchedKeywords || [],
        source: s.source || 'unknown',
      };
    };

    let bestMatch = null;
    if (result.bestMatch) {
      bestMatch = enrichSuggestion(result.bestMatch);
    }

    const alternatives = result.suggestions.slice(1).map(s => enrichSuggestion({
      ...s,
      confidence: s.score / result.suggestions.reduce((a, b) => a + b.score, 0)
    }));

    return {
      bestMatch,
      alternatives,
    };
  }

  async combineResults(rulesResult, statsResult) {
    const combined = new Map();

    const addToMap = (item, weight, source) => {
      const key = item.categorySlug || item.categoryId;
      if (!key) return;

      const existing = combined.get(key) || {
        categorySlug: item.categorySlug,
        categoryId: item.categoryId,
        subcategorySlug: item.subcategorySlug,
        subcategoryId: item.subcategoryId,
        score: 0,
        matchedKeywords: [],
        sources: [],
      };

      existing.score += item.score * weight;
      existing.sources.push(source);
      if (item.matchedKeywords) {
        existing.matchedKeywords.push(...item.matchedKeywords);
      }
      if (item.subcategorySlug && !existing.subcategorySlug) {
        existing.subcategorySlug = item.subcategorySlug;
      }
      if (item.subcategoryId && !existing.subcategoryId) {
        existing.subcategoryId = item.subcategoryId;
      }

      combined.set(key, existing);
    };

    if (rulesResult.suggestions) {
      for (const s of rulesResult.suggestions) {
        addToMap(s, RULE_WEIGHT, 'rules');
      }
    }

    if (statsResult.suggestions) {
      for (const s of statsResult.suggestions) {
        addToMap(s, STATS_WEIGHT, 'stats');
      }
    }

    const sorted = Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (!sorted.length) {
      return { bestMatch: null, suggestions: [] };
    }

    const totalScore = sorted.reduce((acc, s) => acc + s.score, 0);
    const best = sorted[0];

    return {
      bestMatch: {
        ...best,
        confidence: best.score / totalScore,
        source: best.sources.join('+'),
      },
      suggestions: sorted.map(s => ({
        ...s,
        source: s.sources.join('+'),
      })),
    };
  }

  async suggest(title, description = '') {
    const text = `${title || ''} ${description || ''}`.trim();
    
    if (!text || text.length < 3) {
      return { bestMatch: null, alternatives: [] };
    }

    const rulesResult = this.suggestCategoryByRules(text);

    let statsResult = { bestMatch: null, suggestions: [] };
    try {
      statsResult = await CategoryWordStatsService.suggestByStats(text, 5);
    } catch (error) {
      console.error('[CategorySuggest] Stats error:', error.message);
    }

    let finalResult;
    
    if (rulesResult.bestMatch && statsResult.bestMatch) {
      finalResult = await this.combineResults(rulesResult, statsResult);
    } else if (rulesResult.bestMatch) {
      finalResult = rulesResult;
    } else if (statsResult.bestMatch) {
      finalResult = statsResult;
    } else {
      return { bestMatch: null, alternatives: [] };
    }

    return await this.enrichWithCategoryData(finalResult);
  }

  suggestCategoryByText(text) {
    return this.suggestCategoryByRules(text);
  }
}

export default new CategorySuggestService();
