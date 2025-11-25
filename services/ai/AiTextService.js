const CATEGORY_TEMPLATES = {
  electronics: {
    titleTemplates: [
      '{brand} {model}, {condition}',
      '{brand} {model} - {feature}',
      '{model} ({brand}), {condition}'
    ],
    descriptionTemplate: `{title}

Состояние: {condition}
{features}

{extras}

Возможен торг. Самовывоз или доставка по договорённости.`
  },
  farmer: {
    titleTemplates: [
      '{product} свежий, {unit}',
      'Домашний {product}, {quality}',
      '{product} с фермы, {quantity}'
    ],
    descriptionTemplate: `{title}

Свежий урожай! {quality}

{features}

Возможна доставка. Оптом дешевле.`
  },
  auto: {
    titleTemplates: [
      '{brand} {model} {year}, {mileage} км',
      '{brand} {model}, {year} год, {condition}',
      '{model} ({brand}) {year} - {feature}'
    ],
    descriptionTemplate: `{title}

Год выпуска: {year}
Пробег: {mileage} км
Состояние: {condition}

{features}

Торг уместен. Возможен обмен.`
  },
  realty: {
    titleTemplates: [
      '{type} {rooms}-комн., {area} м², {district}',
      '{rooms}-комнатная {type}, {area} м²',
      '{type} в {district}, {rooms} комнаты'
    ],
    descriptionTemplate: `{title}

Площадь: {area} м²
Комнат: {rooms}
Район: {district}

{features}

{extras}`
  },
  default: {
    titleTemplates: [
      '{product}, {condition}',
      '{product} - {feature}',
      '{condition} {product}'
    ],
    descriptionTemplate: `{title}

{features}

Состояние: {condition}

{extras}`
  }
};

const CONDITION_SYNONYMS = {
  'новый': ['новый', 'в упаковке', 'запечатанный', 'не использовался'],
  'отличный': ['отличное состояние', 'как новый', 'идеальный', 'без царапин'],
  'хороший': ['хорошее состояние', 'рабочий', 'нормальный', 'б/у'],
  'удовлетворительный': ['рабочий', 'есть следы использования', 'требует внимания']
};

const KEYWORDS_TO_CATEGORY = {
  'iphone': 'electronics',
  'samsung': 'electronics',
  'xiaomi': 'electronics',
  'телефон': 'electronics',
  'ноутбук': 'electronics',
  'планшет': 'electronics',
  'клубника': 'farmer',
  'картофель': 'farmer',
  'овощи': 'farmer',
  'фрукты': 'farmer',
  'мёд': 'farmer',
  'молоко': 'farmer',
  'яйца': 'farmer',
  'bmw': 'auto',
  'audi': 'auto',
  'volkswagen': 'auto',
  'машина': 'auto',
  'авто': 'auto',
  'квартира': 'realty',
  'дом': 'realty',
  'комната': 'realty',
  'аренда': 'realty'
};

class AiTextService {
  detectCategoryFromText(text) {
    const lowerText = text.toLowerCase();
    for (const [keyword, category] of Object.entries(KEYWORDS_TO_CATEGORY)) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
    return 'default';
  }

  extractAttributes(text) {
    const attributes = {};
    
    const brandPatterns = [
      /\b(iphone|samsung|xiaomi|huawei|apple|sony|lg|bosch|siemens)\b/i,
      /\b(bmw|audi|volkswagen|mercedes|toyota|honda|ford|opel)\b/i
    ];
    
    for (const pattern of brandPatterns) {
      const match = text.match(pattern);
      if (match) {
        attributes.brand = match[1];
        break;
      }
    }
    
    const modelMatch = text.match(/\b(\d+\s*(pro|max|plus|mini|ultra)?)\b/i);
    if (modelMatch) {
      attributes.model = modelMatch[1];
    }
    
    const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) {
      attributes.year = yearMatch[1];
    }
    
    const priceMatch = text.match(/(\d+[\s,.]?\d*)\s*(byn|руб|р|$|€)?/i);
    if (priceMatch) {
      attributes.price = priceMatch[1].replace(/\s/g, '');
    }
    
    const conditionPatterns = [
      { pattern: /\b(новый|новая|новое|в упаковке)\b/i, condition: 'новый' },
      { pattern: /\b(отлично|идеально|как новый)\b/i, condition: 'отличный' },
      { pattern: /\b(хорошо|нормально|рабочий)\b/i, condition: 'хороший' },
      { pattern: /\b(б\/?у|использовался)\b/i, condition: 'хороший' }
    ];
    
    for (const { pattern, condition } of conditionPatterns) {
      if (pattern.test(text)) {
        attributes.condition = condition;
        break;
      }
    }
    
    if (!attributes.condition) {
      attributes.condition = 'хороший';
    }
    
    return attributes;
  }

  generateTitleVariants(input) {
    const { rawText = '', categoryId, attributes = {} } = input;
    
    const detectedCategory = categoryId || this.detectCategoryFromText(rawText);
    const extractedAttrs = { ...this.extractAttributes(rawText), ...attributes };
    const templates = CATEGORY_TEMPLATES[detectedCategory] || CATEGORY_TEMPLATES.default;
    
    const variants = [];
    
    if (rawText.length > 10) {
      const cleanedText = rawText
        .replace(/продам|куплю|срочно/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanedText.length > 5 && cleanedText.length < 100) {
        const capitalized = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
        variants.push(capitalized);
      }
    }
    
    for (const template of templates.titleTemplates) {
      let title = template;
      
      for (const [key, value] of Object.entries(extractedAttrs)) {
        title = title.replace(`{${key}}`, value || '');
      }
      
      title = title.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();
      title = title.replace(/^[,\s]+|[,\s]+$/g, '');
      
      if (title.length > 10) {
        variants.push(title);
      }
    }
    
    if (extractedAttrs.brand) {
      const brandTitle = `${extractedAttrs.brand} ${extractedAttrs.model || ''}, ${extractedAttrs.condition}`.trim();
      if (!variants.includes(brandTitle)) {
        variants.push(brandTitle);
      }
    }
    
    return variants.slice(0, 5);
  }

  generateDescription(input) {
    const { title = '', categoryId, bulletPoints = [], attributes = {} } = input;
    
    const detectedCategory = categoryId || this.detectCategoryFromText(title);
    const templates = CATEGORY_TEMPLATES[detectedCategory] || CATEGORY_TEMPLATES.default;
    
    let description = templates.descriptionTemplate;
    
    description = description.replace('{title}', title);
    
    for (const [key, value] of Object.entries(attributes)) {
      description = description.replace(`{${key}}`, value || '');
    }
    
    if (bulletPoints.length > 0) {
      const featuresText = bulletPoints.map(p => `• ${p}`).join('\n');
      description = description.replace('{features}', featuresText);
    } else {
      description = description.replace('{features}', '');
    }
    
    description = description.replace('{extras}', '');
    
    description = description
      .replace(/\{[^}]+\}/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return description;
  }

  generateTags(input) {
    const { title = '', description = '', categoryId } = input;
    const combinedText = `${title} ${description}`.toLowerCase();
    
    const tags = new Set();
    
    const detectedCategory = categoryId || this.detectCategoryFromText(combinedText);
    tags.add(detectedCategory);
    
    const attributes = this.extractAttributes(combinedText);
    if (attributes.brand) tags.add(attributes.brand.toLowerCase());
    if (attributes.condition) tags.add(attributes.condition);
    
    const commonTags = [
      'новый', 'б/у', 'срочно', 'торг', 'доставка', 'самовывоз',
      'гарантия', 'оригинал', 'качество', 'дёшево', 'выгодно'
    ];
    
    for (const tag of commonTags) {
      if (combinedText.includes(tag)) {
        tags.add(tag);
      }
    }
    
    return Array.from(tags).slice(0, 10);
  }

  async suggestTitle(input) {
    try {
      const variants = this.generateTitleVariants(input);
      return {
        success: true,
        data: {
          suggestions: variants,
          detectedCategory: input.categoryId || this.detectCategoryFromText(input.rawText || '')
        }
      };
    } catch (error) {
      console.error('[AiTextService] suggestTitle error:', error);
      return {
        success: false,
        error: error.message,
        data: { suggestions: [] }
      };
    }
  }

  async suggestDescription(input) {
    try {
      const description = this.generateDescription(input);
      return {
        success: true,
        data: {
          description,
          detectedCategory: input.categoryId || this.detectCategoryFromText(input.title || '')
        }
      };
    } catch (error) {
      console.error('[AiTextService] suggestDescription error:', error);
      return {
        success: false,
        error: error.message,
        data: { description: '' }
      };
    }
  }

  async suggestTags(input) {
    try {
      const tags = this.generateTags(input);
      return {
        success: true,
        data: { tags }
      };
    } catch (error) {
      console.error('[AiTextService] suggestTags error:', error);
      return {
        success: false,
        error: error.message,
        data: { tags: [] }
      };
    }
  }
}

const aiTextService = new AiTextService();

export default aiTextService;
export { AiTextService };
