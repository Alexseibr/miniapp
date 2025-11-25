import Category from '../models/Category.js';

const FARMER_KEYWORDS = {
  'farmer-vegetables': {
    keywords: ['овощ', 'помидор', 'томат', 'огурец', 'морковь', 'свекла', 'капуста', 'лук', 'чеснок', 'перец', 'баклажан', 'кабачок', 'тыква', 'редис', 'репа', 'брокколи', 'цветная капуста', 'брюссельская'],
    weight: 1.0,
  },
  'farmer-fruits': {
    keywords: ['фрукт', 'яблоко', 'груша', 'слива', 'абрикос', 'персик', 'вишня', 'черешня', 'виноград', 'алыча', 'нектарин'],
    weight: 1.0,
  },
  'farmer-berries': {
    keywords: ['ягод', 'клубника', 'малина', 'черника', 'голубика', 'ежевика', 'смородина', 'крыжовник', 'земляника', 'брусника', 'клюква', 'арбуз', 'дыня', 'мороженая малина', 'замороженн'],
    weight: 1.0,
  },
  'farmer-greens': {
    keywords: ['зелень', 'укроп', 'петрушка', 'кинза', 'базилик', 'салат', 'шпинат', 'руккола', 'мята', 'щавель', 'лук-порей', 'сельдерей', 'кресс'],
    weight: 1.0,
  },
  'farmer-potato': {
    keywords: ['картофель', 'картошка', 'бульба', 'картоха', 'молодая картошка', 'молодой картофель'],
    weight: 1.2,
  },
  'farmer-canning': {
    keywords: ['консерв', 'варенье', 'соленье', 'компот', 'маринад', 'закатка', 'заготовка', 'огурчики', 'помидорчики', 'лечо', 'аджика', 'джем', 'повидло', 'домашн', 'банка'],
    weight: 0.9,
  },
  'farmer-honey': {
    keywords: ['мёд', 'мед', 'прополис', 'перга', 'пыльца', 'воск', 'соты', 'забрус', 'маточное молочко', 'пчелопродукт', 'липовый', 'гречишный', 'цветочный', 'акациевый', 'пчел'],
    weight: 1.0,
  },
  'farmer-dairy': {
    keywords: ['молоко', 'молочк', 'сметана', 'творог', 'сыр домашний', 'масло сливочное', 'кефир', 'ряженка', 'йогурт домашний', 'яйцо', 'яйца', 'домашние яйца', 'деревенские', 'фермерские'],
    weight: 1.0,
  },
  'farmer-meat': {
    keywords: ['мясо', 'птица', 'рыба', 'свинина', 'говядина', 'баранина', 'курица домашняя', 'утка', 'гусь', 'индейка', 'кролик', 'перепел', 'филе', 'фарш домашний', 'колбаса домашняя', 'сало', 'карп', 'щука', 'сом', 'форель'],
    weight: 1.0,
  },
  'farmer-plants': {
    keywords: ['рассада', 'саженец', 'семена', 'растение', 'цветок', 'куст', 'дерево', 'роза', 'туя', 'клубника рассада', 'черенок', 'луковица'],
    weight: 1.0,
  },
  'farmer-feed': {
    keywords: ['сено', 'зерно', 'корм', 'комбикорм', 'солома', 'овёс', 'пшеница', 'ячмень', 'кукуруза зерно', 'отруби', 'жмых', 'силос'],
    weight: 0.9,
  },
};

const SEASONAL_KEYWORDS = {
  'farmer-seasonal-valentine': {
    keywords: ['валентин', '14 февраля', 'любовь', 'сердце', 'романтик'],
    months: [1, 2],
  },
  'farmer-seasonal-march8': {
    keywords: ['8 марта', 'тюльпан', 'мимоза', 'букет', 'цветы женщин', 'женский день'],
    months: [2, 3],
  },
  'farmer-seasonal-easter': {
    keywords: ['пасха', 'кулич', 'пасхальн', 'крашенк', 'писанк', 'яйца пасхальные'],
    months: [3, 4, 5],
  },
  'farmer-seasonal-harvest': {
    keywords: ['урожай', 'сезон', 'свежий урожай', 'осенний'],
    months: [7, 8, 9, 10],
  },
  'farmer-seasonal-newyear': {
    keywords: ['новый год', 'новогодн', 'ёлка', 'елка', 'рождеств', 'подарок новогодний'],
    months: [11, 0, 1],
  },
};

const UNIT_CONVERSIONS = {
  kg: { toGrams: 1000, label: 'кг' },
  g: { toGrams: 1, label: 'г' },
  liter: { toMl: 1000, label: 'л' },
  piece: { label: 'шт' },
  pack: { label: 'уп' },
  jar: { label: 'банка' },
  bunch: { label: 'пучок' },
  bag: { label: 'мешок' },
};

class FarmerCategoryService {
  constructor() {
    this.farmerKeywords = FARMER_KEYWORDS;
    this.seasonalKeywords = SEASONAL_KEYWORDS;
    this.unitConversions = UNIT_CONVERSIONS;
  }

  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^\wа-яa-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  suggestFarmerCategory(text) {
    const normalized = this.normalizeText(text);
    const results = [];
    const currentMonth = new Date().getMonth();

    for (const [slug, data] of Object.entries(this.seasonalKeywords)) {
      if (data.months.includes(currentMonth)) {
        for (const keyword of data.keywords) {
          if (normalized.includes(keyword)) {
            results.push({
              slug,
              confidence: 0.9,
              matchedKeyword: keyword,
              isSeasonal: true,
            });
          }
        }
      }
    }

    for (const [slug, data] of Object.entries(this.farmerKeywords)) {
      for (const keyword of data.keywords) {
        if (normalized.includes(keyword)) {
          const baseConfidence = keyword.length > 5 ? 0.8 : 0.6;
          results.push({
            slug,
            confidence: baseConfidence * data.weight,
            matchedKeyword: keyword,
            isSeasonal: false,
          });
        }
      }
    }

    if (results.length === 0) {
      return null;
    }

    results.sort((a, b) => {
      if (a.isSeasonal && !b.isSeasonal) return -1;
      if (!a.isSeasonal && b.isSeasonal) return 1;
      return b.confidence - a.confidence;
    });

    return results[0];
  }

  async getActiveFarmerCategories() {
    const categories = await Category.find({
      isFarmerCategory: true,
      isActive: true,
    }).sort({ level: 1, sortOrder: 1 });

    const now = new Date();
    
    return categories.filter(cat => {
      if (!cat.isSeasonal) return true;
      
      if (cat.seasonStart && cat.seasonEnd) {
        const start = new Date(cat.seasonStart);
        const end = new Date(cat.seasonEnd);
        
        start.setFullYear(now.getFullYear());
        end.setFullYear(now.getFullYear());
        
        if (end < start) {
          end.setFullYear(end.getFullYear() + 1);
        }
        
        return now >= start && now <= end;
      }
      
      return true;
    });
  }

  async getActiveSeasonalCategories() {
    const now = new Date();
    
    const categories = await Category.find({
      isFarmerCategory: true,
      isSeasonal: true,
      isActive: true,
    }).sort({ sortOrder: 1 });

    return categories.filter(cat => {
      if (cat.seasonStart && cat.seasonEnd) {
        const start = new Date(cat.seasonStart);
        const end = new Date(cat.seasonEnd);
        
        start.setFullYear(now.getFullYear());
        end.setFullYear(now.getFullYear());
        
        if (end < start) {
          end.setFullYear(end.getFullYear() + 1);
        }
        
        return now >= start && now <= end;
      }
      return false;
    });
  }

  convertPrice(price, fromUnit, toUnit) {
    if (fromUnit === toUnit) return price;

    if (fromUnit === 'kg' && toUnit === 'g') {
      return price / 1000;
    }
    if (fromUnit === 'g' && toUnit === 'kg') {
      return price * 1000;
    }
    if (fromUnit === 'liter' && toUnit === 'ml') {
      return price / 1000;
    }

    return null;
  }

  calculatePricePerKg(price, unit, quantity = 1) {
    if (unit === 'kg') {
      return price / quantity;
    }
    if (unit === 'g') {
      return (price / quantity) * 1000;
    }
    if (unit === 'bag') {
      return null;
    }
    return null;
  }

  getUnitLabel(unit) {
    return this.unitConversions[unit]?.label || unit;
  }

  formatPriceWithUnit(price, unit, currency = 'BYN') {
    const label = this.getUnitLabel(unit);
    return `${price} ${currency}/${label}`;
  }

  suggestBagPriceBreakdown(price, weightKg) {
    if (weightKg <= 0) return null;
    
    const pricePerKg = price / weightKg;
    return {
      pricePerKg: Math.round(pricePerKg * 100) / 100,
      suggestion: `Цена за кг: ${pricePerKg.toFixed(2)} BYN`,
    };
  }

  detectQuantityFromText(text) {
    const normalized = this.normalizeText(text);
    
    const patterns = [
      { regex: /(\d+(?:[.,]\d+)?)\s*кг/i, unit: 'kg' },
      { regex: /(\d+(?:[.,]\d+)?)\s*г(?:рамм)?/i, unit: 'g' },
      { regex: /(\d+(?:[.,]\d+)?)\s*л(?:итр)?/i, unit: 'liter' },
      { regex: /(\d+(?:[.,]\d+)?)\s*(?:шт|штук)/i, unit: 'piece' },
      { regex: /(\d+(?:[.,]\d+)?)\s*(?:банк|банок)/i, unit: 'jar' },
      { regex: /(\d+(?:[.,]\d+)?)\s*(?:пучк|пучок)/i, unit: 'bunch' },
      { regex: /(\d+(?:[.,]\d+)?)\s*(?:мешк|мешок)/i, unit: 'bag' },
      { regex: /(\d+(?:[.,]\d+)?)\s*(?:упаков|уп)/i, unit: 'pack' },
    ];

    for (const { regex, unit } of patterns) {
      const match = normalized.match(regex);
      if (match) {
        return {
          quantity: parseFloat(match[1].replace(',', '.')),
          unit,
        };
      }
    }

    return null;
  }

  async getFarmerCategoryTree() {
    const categories = await this.getActiveFarmerCategories();
    
    const root = categories.find(c => c.slug === 'farmer-market');
    if (!root) return null;

    const subcategories = categories.filter(c => 
      c.parentSlug === 'farmer-market' && !c.isSeasonal
    );

    const seasonal = categories.filter(c => 
      c.parentSlug === 'farmer-seasonal'
    );

    return {
      root,
      subcategories,
      seasonal,
    };
  }
}

export default new FarmerCategoryService();
