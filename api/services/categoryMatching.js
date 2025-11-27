import Category from '../../models/Category.js';

class CategoryMatchingService {
  constructor() {
    this.categories = [];
    this.lastIndexedAt = null;
    this.indexTTL = 5 * 60 * 1000; // 5 минут
    this.queryCache = new Map();
    this.queryCacheTTL = 5 * 60 * 1000; // 5 минут кеш для запросов
  }

  async ensureIndexed() {
    const now = Date.now();
    if (this.lastIndexedAt && (now - this.lastIndexedAt) < this.indexTTL) {
      return; // Индекс актуален
    }

    const categories = await Category.find().lean();
    this.categories = categories.map(cat => ({
      slug: cat.slug,
      name: cat.name,
      icon3d: cat.icon3d,
      parentSlug: cat.parentSlug,
      level: cat.level,
      isLeaf: cat.isLeaf,
      keywordTokens: cat.keywordTokens || [],
      boostWeight: cat.boostWeight || 1.0,
      // Нормализованные токены для поиска
      searchTokens: new Set([
        cat.name.toLowerCase(),
        ...(cat.keywordTokens || []).map(t => t.toLowerCase())
      ])
    }));

    this.lastIndexedAt = now;
    console.log(`✅ Category index refreshed: ${this.categories.length} categories`);
  }

  normalizeQuery(query) {
    return query
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:]/g, '') // Удаляем пунктуацию
      .replace(/\s+/g, ' '); // Нормализуем пробелы
  }

  /**
   * Находит категории по запросу и возвращает их с оценками
   * @param {string} query - Поисковый запрос
   * @returns {Array} Массив объектов {category, score, matchType, reason}
   */
  async scoreCandidates(query) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return [];
    }

    // Проверяем кеш
    const cacheKey = query.toLowerCase();
    const cached = this.queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.queryCacheTTL) {
      return cached.results;
    }

    await this.ensureIndexed();

    const normalizedQuery = this.normalizeQuery(query);
    const queryTokens = normalizedQuery.split(' ');
    
    const matches = [];

    for (const category of this.categories) {
      let score = 0;
      let matchType = 'none';
      let reason = '';

      // 1. Проверка на точное совпадение названия
      if (category.name.toLowerCase() === normalizedQuery) {
        score = 100 * category.boostWeight;
        matchType = 'exact_name';
        reason = `Точное совпадение с названием: "${category.name}"`;
      }
      // 2. Проверка на точное совпадение ключевого слова
      else if (category.searchTokens.has(normalizedQuery)) {
        score = 90 * category.boostWeight;
        matchType = 'exact_keyword';
        reason = 'Точное совпадение с ключевым словом';
      }
      // 3. Проверка на вхождение всех слов запроса
      else {
        let allTokensMatch = true;
        let partialScore = 0;

        for (const queryToken of queryTokens) {
          let tokenMatched = false;

          // Проверяем точное совпадение токена
          if (category.searchTokens.has(queryToken)) {
            partialScore += 20;
            tokenMatched = true;
          } else {
            // Проверяем частичное совпадение
            for (const searchToken of category.searchTokens) {
              if (searchToken.includes(queryToken) || queryToken.includes(searchToken)) {
                partialScore += 10;
                tokenMatched = true;
                break;
              }
            }
          }

          if (!tokenMatched) {
            allTokensMatch = false;
          }
        }

        if (allTokensMatch && queryTokens.length > 0) {
          score = partialScore * category.boostWeight;
          matchType = 'all_tokens';
          reason = 'Все слова запроса найдены в ключевых словах';
        } else if (partialScore > 0) {
          score = (partialScore * 0.5) * category.boostWeight;
          matchType = 'partial';
          reason = 'Частичное совпадение';
        }
      }

      // Учитываем уровень категории - предпочитаем конечные категории
      if (category.isLeaf) {
        score *= 1.1;
      }

      if (score > 0) {
        matches.push({
          category: {
            slug: category.slug,
            name: category.name,
            icon3d: category.icon3d,
            parentSlug: category.parentSlug,
            level: category.level,
            isLeaf: category.isLeaf,
          },
          score: Math.round(score * 10) / 10,
          matchType,
          reason
        });
      }
    }

    // Сортируем по score (убывание)
    matches.sort((a, b) => b.score - a.score);

    // Берем топ-10 результатов
    const topMatches = matches.slice(0, 10);

    // Кешируем результат
    this.queryCache.set(cacheKey, {
      results: topMatches,
      timestamp: Date.now()
    });

    // Очищаем старые записи кеша
    if (this.queryCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of this.queryCache.entries()) {
        if (now - value.timestamp > this.queryCacheTTL) {
          this.queryCache.delete(key);
        }
      }
    }

    return topMatches;
  }

  /**
   * Строит полный путь категории (включая родительские)
   * @param {string} slug - Slug категории
   * @returns {Array} Массив названий от корня к категории
   */
  async buildCategoryPath(slug) {
    await this.ensureIndexed();
    
    const path = [];
    let currentSlug = slug;

    while (currentSlug) {
      const category = this.categories.find(c => c.slug === currentSlug);
      if (!category) break;

      path.unshift(category.name);
      currentSlug = category.parentSlug;
    }

    return path;
  }

  /**
   * Находит top-level родителя категории
   * @param {string} slug - Slug категории
   * @returns {string|null} Slug top-level категории (level 1)
   */
  async findTopLevelParent(slug) {
    await this.ensureIndexed();
    
    let currentSlug = slug;
    let topLevelSlug = slug;

    while (currentSlug) {
      const category = this.categories.find(c => c.slug === currentSlug);
      if (!category) break;

      if (category.level === 1) {
        topLevelSlug = category.slug;
        break;
      }

      topLevelSlug = category.slug;
      currentSlug = category.parentSlug;
    }

    return topLevelSlug;
  }

  /**
   * Находит прямого потомка top-level категории (level 2)
   * @param {string} slug - Slug категории
   * @returns {string|null} Slug level-2 категории (или null если level-1)
   */
  async findDirectSubcategory(slug) {
    await this.ensureIndexed();
    
    const category = this.categories.find(c => c.slug === slug);
    if (!category) return null;

    if (category.level === 1) {
      return null;
    }

    if (category.level === 2) {
      return slug;
    }

    let currentSlug = slug;
    let level2Slug = null;

    while (currentSlug) {
      const cat = this.categories.find(c => c.slug === currentSlug);
      if (!cat) break;

      if (cat.level === 2) {
        level2Slug = cat.slug;
        break;
      }

      if (cat.level === 1) {
        level2Slug = slug;
        break;
      }

      currentSlug = cat.parentSlug;
    }

    return level2Slug;
  }
}

// Singleton instance
const categoryMatchingService = new CategoryMatchingService();

export default categoryMatchingService;
