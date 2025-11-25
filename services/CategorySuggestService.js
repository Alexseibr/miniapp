import Category from '../models/Category.js';
import { CATEGORY_KEYWORD_RULES } from '../config/categoryKeywordsConfig.js';

class CategorySuggestService {
  normalize(text) {
    return text
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-z0-9а-яё\s-]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  suggestCategoryByText(text) {
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
    if (result.bestMatch) {
      allSlugs.add(result.bestMatch.categorySlug);
      if (result.bestMatch.subcategorySlug) {
        allSlugs.add(result.bestMatch.subcategorySlug);
      }
    }
    for (const s of result.suggestions) {
      allSlugs.add(s.categorySlug);
      if (s.subcategorySlug) {
        allSlugs.add(s.subcategorySlug);
      }
    }

    const categories = await Category.find({ slug: { $in: Array.from(allSlugs) } }).lean();
    const categoryMap = new Map();
    for (const cat of categories) {
      categoryMap.set(cat.slug, cat);
    }

    const parentSlugs = new Set();
    for (const cat of categories) {
      if (cat.parentSlug) {
        parentSlugs.add(cat.parentSlug);
      }
    }
    
    const parentCategories = await Category.find({ slug: { $in: Array.from(parentSlugs) } }).lean();
    for (const cat of parentCategories) {
      categoryMap.set(cat.slug, cat);
    }

    const enrichSuggestion = (s) => {
      const mainCat = categoryMap.get(s.categorySlug);
      const subCat = s.subcategorySlug ? categoryMap.get(s.subcategorySlug) : null;
      
      let parentCat = null;
      if (subCat && subCat.parentSlug) {
        parentCat = categoryMap.get(subCat.parentSlug);
      }
      
      const actualParent = parentCat || mainCat;
      const actualChild = subCat && subCat.slug !== mainCat?.slug ? subCat : null;

      return {
        categoryId: actualParent?._id?.toString() || null,
        categoryName: actualParent?.name || s.categorySlug,
        categorySlug: actualParent?.slug || s.categorySlug,
        subcategoryId: actualChild?._id?.toString() || null,
        subcategoryName: actualChild?.name || null,
        subcategorySlug: actualChild?.slug || null,
        score: s.score,
        confidence: s.confidence,
        matchedKeywords: s.matchedKeywords,
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

  async suggest(title, description = '') {
    const text = `${title || ''} ${description || ''}`.trim();
    
    if (!text || text.length < 3) {
      return { bestMatch: null, alternatives: [] };
    }

    const result = this.suggestCategoryByText(text);
    return await this.enrichWithCategoryData(result);
  }
}

export default new CategorySuggestService();
