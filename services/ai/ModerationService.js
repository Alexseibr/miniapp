const BAD_WORDS_RU = [
  'блять', 'сука', 'хуй', 'пизд', 'ебать', 'ёб', 'еб', 'бля', 'нах', 'пох',
  'мудак', 'дебил', 'идиот', 'урод', 'тварь', 'шлюха', 'проститутка'
];

const PROHIBITED_CONTENT = [
  'наркотик', 'марихуана', 'кокаин', 'героин', 'амфетамин', 'мефедрон',
  'оружие', 'пистолет', 'автомат', 'боеприпасы', 'патрон', 'взрывчат',
  'порно', 'xxx', '18+', 'интим услуги', 'эскорт',
  'фальшивые документы', 'поддельн', 'купить паспорт', 'водительские права купить',
  'ставки', 'казино', 'букмекер', 'лёгкие деньги', 'заработок без вложений',
  'пирамида', 'млм', 'сетевой маркетинг', 'быстрый заработок',
  'экстремизм', 'терроризм', 'нацизм', 'свастика'
];

const SCAM_PHRASES = [
  '100% гарантия', 'гарантированный доход', 'без риска',
  'пассивный доход', 'финансовая свобода', 'деньги из воздуха',
  'предоплата обязательна', 'только предоплата', 'переведите аванс',
  'срочно нужны деньги', 'помогите деньгами',
  'выиграл приз', 'вы выиграли', 'получите бонус',
  'crypto', 'bitcoin', 'инвестиции в крипту',
  'работа на дому 500$', 'легкий заработок'
];

const SUSPICIOUS_PHONES = [
  /\+7\s*9[0-9]{2}.*casino/i,
  /\+380.*бесплатно/i
];

const CATEGORY_PRICE_RANGES = {
  'electronics': { min: 10, max: 50000, suspiciousLow: 0.3 },
  'phones': { min: 50, max: 5000, suspiciousLow: 0.2 },
  'auto': { min: 500, max: 500000, suspiciousLow: 0.3 },
  'realty': { min: 5000, max: 1000000, suspiciousLow: 0.4 },
  'farmer': { min: 0.5, max: 1000, suspiciousLow: 0.5 }
};

class ModerationService {
  constructor() {
    this.badWordsRegex = new RegExp(BAD_WORDS_RU.join('|'), 'gi');
    this.prohibitedRegex = new RegExp(PROHIBITED_CONTENT.join('|'), 'gi');
    this.scamRegex = new RegExp(SCAM_PHRASES.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
  }

  checkBadWords(text) {
    if (!text) return { found: false, matches: [] };
    
    const matches = text.match(this.badWordsRegex) || [];
    return {
      found: matches.length > 0,
      matches: [...new Set(matches.map(m => m.toLowerCase()))]
    };
  }

  checkProhibitedContent(text) {
    if (!text) return { found: false, matches: [], categories: [] };
    
    const matches = text.match(this.prohibitedRegex) || [];
    const categories = [];
    
    const lowerText = text.toLowerCase();
    if (/наркотик|марихуана|кокаин|героин/.test(lowerText)) categories.push('drugs');
    if (/оружие|пистолет|автомат|патрон/.test(lowerText)) categories.push('weapons');
    if (/порно|xxx|18\+|интим/.test(lowerText)) categories.push('adult');
    if (/фальшив|поддельн|купить паспорт/.test(lowerText)) categories.push('fake_documents');
    if (/казино|ставки|букмекер/.test(lowerText)) categories.push('gambling');
    if (/экстремизм|терроризм|нацизм/.test(lowerText)) categories.push('extremism');
    
    return {
      found: matches.length > 0,
      matches: [...new Set(matches.map(m => m.toLowerCase()))],
      categories
    };
  }

  checkScamPhrases(text) {
    if (!text) return { found: false, matches: [], riskLevel: 0 };
    
    const matches = text.match(this.scamRegex) || [];
    const riskLevel = Math.min(matches.length * 15, 60);
    
    return {
      found: matches.length > 0,
      matches: [...new Set(matches.map(m => m.toLowerCase()))],
      riskLevel
    };
  }

  checkPriceSuspicion(price, categoryId) {
    if (!price || price <= 0) return { suspicious: false, reason: null };
    
    const ranges = CATEGORY_PRICE_RANGES[categoryId] || CATEGORY_PRICE_RANGES['electronics'];
    
    if (price < ranges.min * ranges.suspiciousLow) {
      return {
        suspicious: true,
        reason: `Подозрительно низкая цена для категории (${price} BYN)`
      };
    }
    
    if (price > ranges.max * 2) {
      return {
        suspicious: true,
        reason: `Необычно высокая цена для категории (${price} BYN)`
      };
    }
    
    return { suspicious: false, reason: null };
  }

  checkExcessiveFormatting(text) {
    if (!text) return { excessive: false, reasons: [] };
    
    const reasons = [];
    
    const capsRatio = (text.match(/[A-ZА-ЯЁ]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 20) {
      reasons.push('Слишком много заглавных букв');
    }
    
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 10) {
      reasons.push('Слишком много эмодзи');
    }
    
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 5) {
      reasons.push('Слишком много восклицательных знаков');
    }
    
    const repeatedChars = text.match(/(.)\1{4,}/g);
    if (repeatedChars) {
      reasons.push('Повторяющиеся символы');
    }
    
    return {
      excessive: reasons.length > 0,
      reasons
    };
  }

  checkContactInfo(phone, username) {
    const issues = [];
    
    if (phone) {
      for (const pattern of SUSPICIOUS_PHONES) {
        if (pattern.test(phone)) {
          issues.push('Подозрительный номер телефона');
          break;
        }
      }
    }
    
    if (username) {
      if (/casino|bet|crypto|invest|money/i.test(username)) {
        issues.push('Подозрительное имя пользователя');
      }
    }
    
    return {
      suspicious: issues.length > 0,
      issues
    };
  }

  async checkAd(input) {
    const { title = '', description = '', categoryId, price, phone, username, photos = [] } = input;
    
    const combinedText = `${title} ${description}`;
    
    const result = {
      isSpam: false,
      isScam: false,
      hasProhibitedContent: false,
      hasBadWords: false,
      riskScore: 0,
      reasons: [],
      details: {}
    };
    
    const badWordsCheck = this.checkBadWords(combinedText);
    if (badWordsCheck.found) {
      result.hasBadWords = true;
      result.riskScore += 25;
      result.reasons.push(`Нецензурная лексика: ${badWordsCheck.matches.slice(0, 3).join(', ')}`);
      result.details.badWords = badWordsCheck.matches;
    }
    
    const prohibitedCheck = this.checkProhibitedContent(combinedText);
    if (prohibitedCheck.found) {
      result.hasProhibitedContent = true;
      result.riskScore += 50;
      result.reasons.push(`Запрещённый контент: ${prohibitedCheck.categories.join(', ')}`);
      result.details.prohibitedCategories = prohibitedCheck.categories;
    }
    
    const scamCheck = this.checkScamPhrases(combinedText);
    if (scamCheck.found) {
      result.isScam = true;
      result.riskScore += scamCheck.riskLevel;
      result.reasons.push('Подозрение на мошенничество');
      result.details.scamPhrases = scamCheck.matches;
    }
    
    const priceCheck = this.checkPriceSuspicion(price, categoryId);
    if (priceCheck.suspicious) {
      result.riskScore += 20;
      result.reasons.push(priceCheck.reason);
    }
    
    const formattingCheck = this.checkExcessiveFormatting(combinedText);
    if (formattingCheck.excessive) {
      result.isSpam = true;
      result.riskScore += 15;
      result.reasons.push(...formattingCheck.reasons);
    }
    
    const contactCheck = this.checkContactInfo(phone, username);
    if (contactCheck.suspicious) {
      result.riskScore += 20;
      result.reasons.push(...contactCheck.issues);
    }
    
    if (title.length < 5) {
      result.riskScore += 10;
      result.reasons.push('Слишком короткий заголовок');
    }
    
    if (description && description.length < 10) {
      result.riskScore += 5;
      result.reasons.push('Слишком короткое описание');
    }
    
    result.riskScore = Math.min(result.riskScore, 100);
    
    let moderationStatus = 'approved';
    if (result.hasProhibitedContent) {
      moderationStatus = 'blocked';
    } else if (result.riskScore >= 70) {
      moderationStatus = 'review';
    } else if (result.riskScore >= 40) {
      moderationStatus = 'pending';
    }
    
    return {
      success: true,
      data: {
        ...result,
        recommendedStatus: moderationStatus
      }
    };
  }

  async getModerationQueue(options = {}) {
    const { default: Ad } = await import('../../models/Ad.js');
    
    const { status = 'review', limit = 50, skip = 0 } = options;
    
    try {
      const query = {};
      
      if (status === 'review') {
        query.moderationStatus = { $in: ['review', 'pending'] };
      } else if (status === 'blocked') {
        query.moderationStatus = 'blocked';
      } else {
        query.moderationStatus = status;
      }
      
      const ads = await Ad.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      const total = await Ad.countDocuments(query);
      
      return {
        success: true,
        data: {
          ads,
          total,
          hasMore: skip + ads.length < total
        }
      };
    } catch (error) {
      console.error('[ModerationService] getModerationQueue error:', error);
      return {
        success: false,
        error: error.message,
        data: { ads: [], total: 0 }
      };
    }
  }
}

const moderationService = new ModerationService();

export default moderationService;
export { ModerationService };
