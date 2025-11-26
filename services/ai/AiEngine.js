import Ad from '../../models/Ad.js';
import Category from '../../models/Category.js';
import User from '../../models/User.js';
import GeoEvent from '../../models/GeoEvent.js';

const KEYWORDS_MAP = {
  electronics: {
    keywords: ['телефон', 'смартфон', 'iphone', 'samsung', 'xiaomi', 'ноутбук', 'планшет', 'компьютер', 'наушники', 'колонка', 'телевизор', 'монитор', 'клавиатура', 'мышь', 'принтер', 'камера', 'фотоаппарат', 'видеокамера', 'игровая приставка', 'playstation', 'xbox', 'nintendo'],
    subcategories: {
      phones: ['телефон', 'смартфон', 'iphone', 'samsung', 'xiaomi', 'huawei', 'honor', 'redmi', 'poco', 'realme', 'oppo', 'vivo', 'oneplus', 'google pixel', 'motorola'],
      laptops: ['ноутбук', 'macbook', 'lenovo', 'dell', 'hp', 'asus', 'acer', 'msi'],
      tablets: ['планшет', 'ipad', 'galaxy tab', 'huawei matepad'],
      audio: ['наушники', 'колонка', 'bluetooth', 'airpods', 'jbl', 'marshall', 'sony wh'],
      tv: ['телевизор', 'smart tv', 'lg', 'samsung tv', 'sony bravia'],
      gaming: ['playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'геймпад', 'джойстик']
    }
  },
  transport: {
    keywords: ['автомобиль', 'машина', 'авто', 'мотоцикл', 'велосипед', 'скутер', 'самокат', 'прицеп', 'лодка', 'катер', 'квадроцикл'],
    subcategories: {
      cars: ['автомобиль', 'машина', 'авто', 'седан', 'кроссовер', 'внедорожник', 'хэтчбек', 'универсал', 'минивэн'],
      motorcycles: ['мотоцикл', 'байк', 'мопед', 'скутер'],
      bicycles: ['велосипед', 'горный', 'шоссейный', 'bmx', 'электровелосипед'],
      boats: ['лодка', 'катер', 'яхта', 'гидроцикл']
    }
  },
  realty: {
    keywords: ['квартира', 'дом', 'комната', 'студия', 'аренда', 'снять', 'сдать', 'продам квартиру', 'куплю квартиру', 'участок', 'дача', 'коттедж', 'таунхаус', 'гараж', 'склад', 'офис', 'помещение'],
    subcategories: {
      apartments: ['квартира', 'студия', 'однокомнатная', 'двухкомнатная', 'трёхкомнатная', 'многокомнатная'],
      houses: ['дом', 'коттедж', 'таунхаус', 'дача', 'загородный'],
      rooms: ['комната', 'койко-место'],
      land: ['участок', 'земля', 'земельный'],
      commercial: ['офис', 'помещение', 'склад', 'магазин', 'торговый']
    }
  },
  clothing: {
    keywords: ['одежда', 'платье', 'куртка', 'пальто', 'джинсы', 'брюки', 'юбка', 'рубашка', 'футболка', 'свитер', 'кроссовки', 'туфли', 'ботинки', 'сапоги', 'сумка', 'рюкзак'],
    subcategories: {
      women: ['платье', 'юбка', 'блузка', 'женская', 'женские'],
      men: ['пиджак', 'костюм', 'мужская', 'мужские', 'мужской'],
      shoes: ['кроссовки', 'туфли', 'ботинки', 'сапоги', 'кеды', 'сандалии', 'обувь'],
      bags: ['сумка', 'рюкзак', 'кошелёк', 'портфель', 'клатч']
    }
  },
  furniture: {
    keywords: ['мебель', 'диван', 'кровать', 'шкаф', 'стол', 'стул', 'кресло', 'комод', 'тумба', 'полка', 'матрас'],
    subcategories: {
      living: ['диван', 'кресло', 'журнальный стол', 'тумба под тв'],
      bedroom: ['кровать', 'матрас', 'комод', 'тумба', 'шкаф'],
      kitchen: ['кухонный гарнитур', 'обеденный стол', 'стулья'],
      office: ['письменный стол', 'офисное кресло', 'стеллаж']
    }
  },
  farm: {
    keywords: ['клубника', 'малина', 'черника', 'ягоды', 'овощи', 'фрукты', 'яблоки', 'груши', 'помидоры', 'огурцы', 'картошка', 'морковь', 'свекла', 'капуста', 'лук', 'чеснок', 'зелень', 'укроп', 'петрушка', 'мёд', 'молоко', 'творог', 'сметана', 'яйца', 'мясо', 'курица', 'свинина', 'говядина', 'рыба', 'грибы', 'варенье', 'соленья', 'выпечка', 'хлеб', 'пирог', 'рассада', 'саженцы', 'семена'],
    subcategories: {
      berries: ['клубника', 'малина', 'черника', 'голубика', 'смородина', 'крыжовник', 'земляника', 'ежевика', 'вишня', 'черешня'],
      vegetables: ['помидоры', 'огурцы', 'картошка', 'морковь', 'свекла', 'капуста', 'лук', 'чеснок', 'перец', 'баклажаны', 'кабачки', 'тыква'],
      fruits: ['яблоки', 'груши', 'сливы', 'абрикосы', 'персики', 'виноград', 'арбуз', 'дыня'],
      dairy: ['молоко', 'творог', 'сметана', 'сыр', 'кефир', 'масло', 'йогурт'],
      meat: ['мясо', 'курица', 'свинина', 'говядина', 'баранина', 'кролик', 'утка', 'индейка', 'фарш', 'колбаса'],
      eggs: ['яйца', 'перепелиные'],
      honey: ['мёд', 'соты', 'прополис', 'пчелопродукты'],
      bakery: ['хлеб', 'выпечка', 'пирог', 'булочки', 'торт', 'печенье'],
      preserves: ['варенье', 'соленья', 'маринады', 'компот', 'джем', 'заготовки'],
      seedlings: ['рассада', 'саженцы', 'семена', 'черенки']
    }
  },
  services: {
    keywords: ['услуги', 'ремонт', 'сантехник', 'электрик', 'мастер', 'уборка', 'клининг', 'репетитор', 'няня', 'водитель', 'грузоперевозки', 'доставка', 'фотограф', 'видеограф', 'дизайн', 'программирование', 'массаж', 'парикмахер', 'маникюр', 'педикюр', 'строительство', 'отделка'],
    subcategories: {
      repair: ['ремонт', 'сантехник', 'электрик', 'мастер', 'плиточник', 'маляр', 'штукатур'],
      cleaning: ['уборка', 'клининг', 'химчистка', 'стирка'],
      education: ['репетитор', 'преподаватель', 'курсы', 'обучение', 'тренер'],
      transport: ['грузоперевозки', 'доставка', 'такси', 'водитель', 'переезд'],
      beauty: ['парикмахер', 'маникюр', 'педикюр', 'визажист', 'косметолог', 'массаж'],
      it: ['программирование', 'веб-разработка', 'дизайн', 'seo', 'smm', 'настройка']
    }
  },
  kids: {
    keywords: ['детский', 'детская', 'детское', 'коляска', 'кроватка', 'игрушки', 'памперсы', 'подгузники', 'детская одежда', 'школьная форма', 'рюкзак школьный', 'велосипед детский', 'самокат детский', 'конструктор', 'лего', 'кукла', 'машинка'],
    subcategories: {
      strollers: ['коляска', 'автокресло', 'переноска'],
      furniture: ['кроватка', 'манеж', 'пеленальный стол', 'стульчик для кормления'],
      toys: ['игрушки', 'конструктор', 'лего', 'кукла', 'машинка', 'мягкая игрушка'],
      clothing: ['детская одежда', 'комбинезон', 'ползунки', 'распашонка']
    }
  },
  pets: {
    keywords: ['собака', 'щенок', 'кошка', 'котёнок', 'попугай', 'хомяк', 'кролик', 'аквариум', 'рыбки', 'корм', 'ошейник', 'поводок', 'переноска', 'клетка', 'вольер', 'лежанка'],
    subcategories: {
      dogs: ['собака', 'щенок', 'корм для собак', 'ошейник', 'поводок'],
      cats: ['кошка', 'котёнок', 'корм для кошек', 'лоток', 'наполнитель'],
      birds: ['попугай', 'канарейка', 'клетка для птиц'],
      fish: ['аквариум', 'рыбки', 'фильтр', 'компрессор'],
      small: ['хомяк', 'кролик', 'морская свинка', 'шиншилла']
    }
  },
  sports: {
    keywords: ['спорт', 'тренажёр', 'гантели', 'штанга', 'велотренажёр', 'беговая дорожка', 'лыжи', 'коньки', 'сноуборд', 'мяч', 'ракетка', 'теннис', 'футбол', 'баскетбол', 'волейбол', 'бокс', 'перчатки', 'палатка', 'спальник', 'удочка', 'спиннинг'],
    subcategories: {
      fitness: ['тренажёр', 'гантели', 'штанга', 'гиря', 'эспандер', 'скакалка', 'коврик'],
      cardio: ['велотренажёр', 'беговая дорожка', 'эллипсоид', 'степпер'],
      winter: ['лыжи', 'коньки', 'сноуборд', 'санки'],
      team: ['мяч', 'футбольный', 'баскетбольный', 'волейбольный'],
      fishing: ['удочка', 'спиннинг', 'катушка', 'блесна', 'воблер'],
      camping: ['палатка', 'спальник', 'рюкзак туристический', 'карематы']
    }
  }
};

const CONDITION_KEYWORDS = {
  new: ['новый', 'новая', 'новое', 'новые', 'в упаковке', 'запечатанный', 'с бирками', 'ни разу не использовался'],
  like_new: ['как новый', 'почти новый', 'идеальное состояние', 'отличное состояние', 'без следов использования'],
  good: ['хорошее состояние', 'нормальное состояние', 'рабочий', 'рабочая', 'рабочее', 'исправный'],
  fair: ['удовлетворительное', 'есть царапины', 'небольшие дефекты', 'требует ремонта', 'на запчасти']
};

const BRAND_PATTERNS = {
  phones: ['iphone', 'samsung', 'xiaomi', 'huawei', 'honor', 'redmi', 'poco', 'realme', 'oppo', 'vivo', 'oneplus', 'google pixel', 'motorola', 'nokia', 'sony', 'lg', 'htc', 'asus', 'meizu', 'zte'],
  laptops: ['macbook', 'lenovo', 'dell', 'hp', 'asus', 'acer', 'msi', 'microsoft surface', 'razer', 'alienware', 'huawei matebook', 'honor magicbook'],
  cars: ['toyota', 'volkswagen', 'bmw', 'mercedes', 'audi', 'ford', 'honda', 'nissan', 'mazda', 'hyundai', 'kia', 'renault', 'peugeot', 'citroen', 'skoda', 'lada', 'газ', 'уаз', 'geely', 'chery', 'haval']
};

class AiEngine {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000;
  }

  getCacheKey(type, params) {
    return `${type}:${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  normalizeText(text) {
    return (text || '').toLowerCase().trim();
  }

  extractKeywords(text) {
    const normalized = this.normalizeText(text);
    const words = normalized.split(/\s+/).filter(w => w.length > 2);
    return words;
  }

  async generateDescription(ad) {
    try {
      const { title, categoryId, photos, price } = ad;
      const titleLower = this.normalizeText(title);
      
      const categoryInfo = await this.detectCategoryInfo(titleLower);
      const condition = this.detectCondition(titleLower);
      const brand = this.detectBrand(titleLower);
      const specs = this.extractSpecs(titleLower);
      
      const shortDescription = this.generateShortDescription(title, categoryInfo, condition, price);
      const fullDescription = this.generateFullDescription(title, categoryInfo, condition, brand, specs, price);
      const tags = this.generateTagsFromText(titleLower, categoryInfo);
      
      return {
        success: true,
        data: {
          shortDescription,
          fullDescription,
          tags,
          params: {
            brand: brand || null,
            model: specs.model || null,
            condition: condition || 'good',
            color: specs.color || null,
            size: specs.size || null,
            year: specs.year || null,
            technicalSpecs: specs.technical || []
          },
          categoryHint: categoryInfo
        }
      };
    } catch (error) {
      console.error('[AiEngine] generateDescription error:', error);
      return { success: false, error: error.message };
    }
  }

  generateShortDescription(title, categoryInfo, condition, price) {
    const conditionText = {
      new: 'Новый товар',
      like_new: 'В отличном состоянии',
      good: 'В хорошем состоянии',
      fair: 'Рабочий товар'
    }[condition] || 'Товар';
    
    if (categoryInfo.category === 'farm') {
      return `Свежие ${title.toLowerCase()}. Прямо от производителя.`;
    }
    
    return `${conditionText}. ${title}. ${price ? `Цена: ${price} руб.` : 'Цена договорная.'}`;
  }

  generateFullDescription(title, categoryInfo, condition, brand, specs, price) {
    const lines = [];
    
    lines.push(`Продаю: ${title}`);
    
    if (brand) {
      lines.push(`Бренд: ${brand}`);
    }
    
    if (specs.model) {
      lines.push(`Модель: ${specs.model}`);
    }
    
    const conditionDesc = {
      new: 'Абсолютно новый товар, в заводской упаковке.',
      like_new: 'Товар практически не использовался, в идеальном состоянии.',
      good: 'Товар в хорошем рабочем состоянии, полностью функционален.',
      fair: 'Товар рабочий, могут быть небольшие следы использования.'
    }[condition];
    
    if (conditionDesc) {
      lines.push(`Состояние: ${conditionDesc}`);
    }
    
    if (specs.color) {
      lines.push(`Цвет: ${specs.color}`);
    }
    
    if (specs.size) {
      lines.push(`Размер: ${specs.size}`);
    }
    
    if (specs.year) {
      lines.push(`Год: ${specs.year}`);
    }
    
    if (categoryInfo.category === 'farm') {
      lines.push('Выращено с любовью, экологически чистый продукт.');
      lines.push('Свежий урожай, прямые поставки.');
    }
    
    lines.push('');
    lines.push('Возможна доставка или самовывоз.');
    lines.push('Пишите, отвечу на все вопросы!');
    
    return lines.join('\n');
  }

  async detectCategoryInfo(text) {
    for (const [category, data] of Object.entries(KEYWORDS_MAP)) {
      for (const keyword of data.keywords) {
        if (text.includes(keyword)) {
          let subcategory = null;
          if (data.subcategories) {
            for (const [sub, subKeywords] of Object.entries(data.subcategories)) {
              for (const subKeyword of subKeywords) {
                if (text.includes(subKeyword)) {
                  subcategory = sub;
                  break;
                }
              }
              if (subcategory) break;
            }
          }
          
          return { category, subcategory, confidence: 0.8 };
        }
      }
    }
    
    return { category: 'other', subcategory: null, confidence: 0.3 };
  }

  detectCondition(text) {
    for (const [condition, keywords] of Object.entries(CONDITION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return condition;
        }
      }
    }
    return 'good';
  }

  detectBrand(text) {
    for (const [type, brands] of Object.entries(BRAND_PATTERNS)) {
      for (const brand of brands) {
        if (text.includes(brand.toLowerCase())) {
          return brand.charAt(0).toUpperCase() + brand.slice(1);
        }
      }
    }
    return null;
  }

  extractSpecs(text) {
    const specs = {
      model: null,
      color: null,
      size: null,
      year: null,
      technical: []
    };
    
    const colorPatterns = {
      'чёрный': ['черный', 'чёрный', 'black'],
      'белый': ['белый', 'white'],
      'серый': ['серый', 'gray', 'grey'],
      'красный': ['красный', 'red'],
      'синий': ['синий', 'blue'],
      'зелёный': ['зеленый', 'зелёный', 'green'],
      'жёлтый': ['желтый', 'жёлтый', 'yellow'],
      'розовый': ['розовый', 'pink'],
      'фиолетовый': ['фиолетовый', 'purple'],
      'золотой': ['золотой', 'gold'],
      'серебристый': ['серебристый', 'silver']
    };
    
    for (const [colorName, patterns] of Object.entries(colorPatterns)) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          specs.color = colorName;
          break;
        }
      }
      if (specs.color) break;
    }
    
    const sizePatterns = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl'];
    for (const size of sizePatterns) {
      const regex = new RegExp(`\\b${size}\\b`, 'i');
      if (regex.test(text)) {
        specs.size = size.toUpperCase();
        break;
      }
    }
    
    const yearMatch = text.match(/\b(20[0-2][0-9]|19[89][0-9])\s*(г\.?|год)?/);
    if (yearMatch) {
      specs.year = parseInt(yearMatch[1]);
    }
    
    const gbMatch = text.match(/(\d+)\s*(gb|гб)/i);
    if (gbMatch) {
      specs.technical.push(`Память: ${gbMatch[1]} ГБ`);
    }
    
    const ramMatch = text.match(/(\d+)\s*(gb|гб)\s*(ram|озу)/i);
    if (ramMatch) {
      specs.technical.push(`ОЗУ: ${ramMatch[1]} ГБ`);
    }
    
    return specs;
  }

  generateTagsFromText(text, categoryInfo) {
    const tags = new Set();
    
    const words = text.split(/\s+/).filter(w => w.length > 3);
    words.forEach(w => tags.add(w));
    
    if (categoryInfo.category) {
      tags.add(categoryInfo.category);
      
      const categoryData = KEYWORDS_MAP[categoryInfo.category];
      if (categoryData) {
        categoryData.keywords.slice(0, 5).forEach(k => {
          if (text.includes(k)) tags.add(k);
        });
      }
    }
    
    if (categoryInfo.subcategory) {
      tags.add(categoryInfo.subcategory);
    }
    
    return Array.from(tags).slice(0, 20);
  }

  async autoCategory(ad) {
    try {
      const { title, description, price, photos } = ad;
      const text = this.normalizeText(`${title} ${description || ''}`);
      
      const categoryInfo = await this.detectCategoryInfo(text);
      
      let dbCategory = null;
      let dbSubcategory = null;
      
      try {
        if (categoryInfo.category !== 'other') {
          dbCategory = await Category.findOne({ 
            slug: { $regex: categoryInfo.category, $options: 'i' },
            parentId: null
          }).lean();
          
          if (dbCategory && categoryInfo.subcategory) {
            dbSubcategory = await Category.findOne({
              parentId: dbCategory._id,
              slug: { $regex: categoryInfo.subcategory, $options: 'i' }
            }).lean();
          }
        }
      } catch (e) {
        console.warn('[AiEngine] Category DB lookup failed:', e.message);
      }
      
      return {
        success: true,
        data: {
          categoryId: dbCategory?._id?.toString() || null,
          categoryName: dbCategory?.name || categoryInfo.category,
          subcategoryId: dbSubcategory?._id?.toString() || null,
          subcategoryName: dbSubcategory?.name || categoryInfo.subcategory,
          confidence: categoryInfo.confidence,
          alternativeCategories: []
        }
      };
    } catch (error) {
      console.error('[AiEngine] autoCategory error:', error);
      return { success: false, error: error.message };
    }
  }

  async generateTags(ad) {
    try {
      const { title, description, categoryId } = ad;
      const text = this.normalizeText(`${title} ${description || ''}`);
      const categoryInfo = await this.detectCategoryInfo(text);
      
      const mainTags = this.generateTagsFromText(text, categoryInfo);
      
      const synonyms = this.generateSynonyms(mainTags);
      
      const allTags = [...new Set([...mainTags, ...synonyms])].slice(0, 25);
      
      return {
        success: true,
        data: {
          tags: allTags,
          mainKeywords: mainTags.slice(0, 5),
          synonyms: synonyms.slice(0, 10)
        }
      };
    } catch (error) {
      console.error('[AiEngine] generateTags error:', error);
      return { success: false, error: error.message };
    }
  }

  generateSynonyms(tags) {
    const synonymMap = {
      'телефон': ['смартфон', 'мобильный', 'сотовый'],
      'смартфон': ['телефон', 'мобильный'],
      'квартира': ['жилье', 'недвижимость', 'апартаменты'],
      'машина': ['автомобиль', 'авто', 'транспорт'],
      'автомобиль': ['машина', 'авто'],
      'велосипед': ['велик', 'байк'],
      'ноутбук': ['лэптоп', 'портативный компьютер'],
      'клубника': ['ягоды', 'садовая ягода'],
      'мёд': ['продукты пчеловодства', 'натуральный мёд'],
      'молоко': ['молочка', 'молочные продукты'],
      'яйца': ['куриные яйца', 'домашние яйца'],
      'овощи': ['свежие овощи', 'урожай'],
      'диван': ['мягкая мебель', 'софа'],
      'кровать': ['спальное место', 'постель'],
      'шкаф': ['мебель для хранения', 'гардероб']
    };
    
    const synonyms = [];
    tags.forEach(tag => {
      if (synonymMap[tag]) {
        synonyms.push(...synonymMap[tag]);
      }
    });
    
    return synonyms;
  }

  async aiIntentSearch(query) {
    try {
      const normalized = this.normalizeText(query);
      
      let intent = 'search';
      
      if (/^(куплю|ищу|нужен|нужна|нужно|хочу купить|хочу найти|требуется)/.test(normalized)) {
        intent = 'buy';
      } else if (/^(продам|продаю|продаётся|отдам|меняю|обменяю)/.test(normalized)) {
        intent = 'sell';
      } else if (/^(сделаю|выполню|предлагаю услуги|оказываю)/.test(normalized)) {
        intent = 'service';
      } else if (/^(сниму|арендую|возьму в аренду)/.test(normalized)) {
        intent = 'rent';
      } else if (/^(сдам|сдаю|в аренду)/.test(normalized)) {
        intent = 'rent_out';
      }
      
      const cleanedQuery = normalized
        .replace(/^(куплю|ищу|нужен|нужна|нужно|хочу купить|хочу найти|требуется|продам|продаю|продаётся|отдам|меняю|обменяю|сделаю|выполню|сниму|арендую|сдам|сдаю)\s+/i, '')
        .trim();
      
      const categoryInfo = await this.detectCategoryInfo(cleanedQuery);
      
      let radiusRecommendation = 10;
      if (categoryInfo.category === 'farm') {
        radiusRecommendation = 30;
      } else if (categoryInfo.category === 'services') {
        radiusRecommendation = 20;
      } else if (categoryInfo.category === 'realty') {
        radiusRecommendation = 50;
      }
      
      const keywords = this.extractKeywords(cleanedQuery);
      
      return {
        success: true,
        data: {
          intent,
          originalQuery: query,
          cleanedQuery,
          categoryCandidates: [categoryInfo],
          keywords,
          radiusRecommendation,
          suggestions: this.generateSearchSuggestions(cleanedQuery, categoryInfo)
        }
      };
    } catch (error) {
      console.error('[AiEngine] aiIntentSearch error:', error);
      return { success: false, error: error.message };
    }
  }

  generateSearchSuggestions(query, categoryInfo) {
    const suggestions = [];
    
    if (categoryInfo.category === 'farm') {
      suggestions.push(`${query} свежие`);
      suggestions.push(`${query} от фермера`);
      suggestions.push(`${query} домашние`);
    } else if (categoryInfo.category === 'electronics') {
      suggestions.push(`${query} б/у`);
      suggestions.push(`${query} новый`);
      suggestions.push(`${query} с гарантией`);
    } else if (categoryInfo.category === 'realty') {
      suggestions.push(`${query} аренда`);
      suggestions.push(`${query} купить`);
      suggestions.push(`${query} недорого`);
    }
    
    return suggestions.slice(0, 5);
  }

  async aiSearch(query, geo = {}) {
    try {
      const { lat, lng, radiusKm = 10 } = geo;
      
      const intentResult = await this.aiIntentSearch(query);
      if (!intentResult.success) {
        return intentResult;
      }
      
      const { cleanedQuery, keywords, categoryCandidates } = intentResult.data;
      
      const searchQuery = {
        status: 'active',
        moderationStatus: 'approved'
      };
      
      if (keywords.length > 0) {
        const keywordsRegex = keywords.join('|');
        searchQuery.$or = [
          { title: { $regex: keywordsRegex, $options: 'i' } },
          { description: { $regex: keywordsRegex, $options: 'i' } },
          { tags: { $in: keywords } }
        ];
      }
      
      if (lat && lng) {
        searchQuery['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusKm / 6378.1]
          }
        };
      }
      
      const ads = await Ad.find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      
      const scoredAds = ads.map(ad => {
        let score = 0;
        const titleLower = this.normalizeText(ad.title);
        const descLower = this.normalizeText(ad.description || '');
        
        keywords.forEach(kw => {
          if (titleLower.includes(kw)) score += 10;
          if (descLower.includes(kw)) score += 5;
          if (ad.tags?.includes(kw)) score += 3;
        });
        
        if (ad.photos?.length > 0) score += 2;
        
        const ageHours = (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) score += 5;
        else if (ageHours < 72) score += 3;
        else if (ageHours < 168) score += 1;
        
        if (lat && lng && ad.location?.coordinates) {
          const [adLng, adLat] = ad.location.coordinates;
          const R = 6371;
          const dLat = (adLat - lat) * Math.PI / 180;
          const dLon = (adLng - lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat * Math.PI / 180) * Math.cos(adLat * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          
          ad.distanceKm = Math.round(distance * 10) / 10;
          score += Math.max(0, 10 - distance);
        }
        
        ad.relevanceScore = score;
        return ad;
      });
      
      scoredAds.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      return {
        success: true,
        data: {
          ads: scoredAds.slice(0, 30).map(ad => ({
            _id: ad._id.toString(),
            title: ad.title,
            price: ad.price,
            currency: ad.currency,
            photos: ad.photos,
            distanceKm: ad.distanceKm,
            relevanceScore: ad.relevanceScore,
            createdAt: ad.createdAt
          })),
          total: scoredAds.length,
          intent: intentResult.data,
          suggestions: intentResult.data.suggestions
        }
      };
    } catch (error) {
      console.error('[AiEngine] aiSearch error:', error);
      return { success: false, error: error.message };
    }
  }

  async aiSuggestForSeller(sellerId) {
    try {
      const suggestions = [];
      
      let seller = null;
      try {
        seller = await User.findById(sellerId).lean();
      } catch (e) {
        console.warn('[AiEngine] Seller lookup failed:', e.message);
      }
      
      let sellerAds = [];
      try {
        sellerAds = await Ad.find({ 
          sellerId: sellerId,
          status: { $in: ['active', 'draft'] }
        }).lean();
      } catch (e) {
        console.warn('[AiEngine] Seller ads lookup failed:', e.message);
      }
      
      const now = new Date();
      const month = now.getMonth();
      const seasonalCategories = [];
      
      if (month >= 5 && month <= 8) {
        seasonalCategories.push({ category: 'berries', demand: 'high', suggestion: 'Сезон ягод! Добавьте клубнику, малину, чернику — спрос высокий.' });
      }
      if (month >= 6 && month <= 9) {
        seasonalCategories.push({ category: 'vegetables', demand: 'high', suggestion: 'Время овощей! Помидоры, огурцы, картофель очень востребованы.' });
      }
      if (month >= 7 && month <= 9) {
        seasonalCategories.push({ category: 'fruits', demand: 'high', suggestion: 'Сезон фруктов. Яблоки и груши хорошо продаются.' });
      }
      if (month >= 7 && month <= 9) {
        seasonalCategories.push({ category: 'honey', demand: 'medium', suggestion: 'Свежий мёд! Сейчас хорошее время для продажи.' });
      }
      if (month >= 8 && month <= 10) {
        seasonalCategories.push({ category: 'mushrooms', demand: 'high', suggestion: 'Грибной сезон! Лисички, белые, подберёзовики ищут.' });
      }
      
      seasonalCategories.forEach(sc => {
        const hasCategory = sellerAds.some(ad => 
          ad.title?.toLowerCase().includes(sc.category) ||
          ad.categoryId?.toString().includes(sc.category)
        );
        
        if (!hasCategory) {
          suggestions.push({
            type: 'seasonal_opportunity',
            priority: sc.demand === 'high' ? 'high' : 'medium',
            icon: '🌱',
            text: sc.suggestion,
            actionType: 'add_product',
            actionData: { category: sc.category }
          });
        }
      });
      
      sellerAds.forEach(ad => {
        if (!ad.photos || ad.photos.length === 0) {
          suggestions.push({
            type: 'photo_missing',
            priority: 'high',
            icon: '📷',
            text: `Добавьте фото к "${ad.title}" — объявления с фото получают в 5 раз больше просмотров!`,
            actionType: 'edit_ad',
            actionData: { adId: ad._id.toString() }
          });
        } else if (ad.photos.length === 1) {
          suggestions.push({
            type: 'photo_few',
            priority: 'medium',
            icon: '📸',
            text: `Добавьте ещё фото к "${ad.title}" — покупатели любят видеть товар с разных сторон.`,
            actionType: 'edit_ad',
            actionData: { adId: ad._id.toString() }
          });
        }
        
        if (!ad.description || ad.description.length < 50) {
          suggestions.push({
            type: 'description_short',
            priority: 'medium',
            icon: '📝',
            text: `Расширьте описание "${ad.title}" — подробные описания увеличивают продажи.`,
            actionType: 'edit_ad',
            actionData: { adId: ad._id.toString() }
          });
        }
      });
      
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        suggestions.push({
          type: 'timing_tip',
          priority: 'low',
          icon: '⏰',
          text: 'Выходные — отличное время для публикации! Покупатели активны.',
          actionType: 'info'
        });
      } else if (hour >= 9 && hour <= 11) {
        suggestions.push({
          type: 'timing_tip',
          priority: 'low',
          icon: '🌅',
          text: 'Утренние публикации работают отлично! Самое время добавить товары.',
          actionType: 'info'
        });
      }
      
      if (sellerAds.length === 0) {
        suggestions.push({
          type: 'first_ad',
          priority: 'high',
          icon: '🚀',
          text: 'Разместите своё первое объявление! Это просто и бесплатно.',
          actionType: 'create_ad'
        });
      } else if (sellerAds.length < 3) {
        suggestions.push({
          type: 'add_more',
          priority: 'medium',
          icon: '➕',
          text: 'Чем больше товаров — тем больше покупателей! Добавьте ещё объявлений.',
          actionType: 'create_ad'
        });
      }
      
      suggestions.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      return {
        success: true,
        data: {
          suggestions: suggestions.slice(0, 10),
          totalAds: sellerAds.length,
          sellerId
        }
      };
    } catch (error) {
      console.error('[AiEngine] aiSuggestForSeller error:', error);
      return { success: false, error: error.message };
    }
  }

  async autoModeration(ad) {
    try {
      const { title, description, price, photos, categoryId } = ad;
      const text = this.normalizeText(`${title} ${description || ''}`);
      
      const issues = [];
      let status = 'ok';
      
      const bannedWords = [
        'оружие', 'наркотики', 'порно', 'xxx', 'казино', 'ставки', 'взлом',
        'пиратский', 'контрафакт', 'поддельный', 'фейк', 'развод', 'обман',
        'мошенничество', 'обналичить', 'отмывание'
      ];
      
      for (const word of bannedWords) {
        if (text.includes(word)) {
          issues.push({ type: 'banned_content', word, severity: 'critical' });
          status = 'reject';
        }
      }
      
      const suspiciousPatterns = [
        { pattern: /заработок.*гарантирован/i, reason: 'Подозрительные обещания' },
        { pattern: /100%.*выигрыш/i, reason: 'Подозрительные обещания' },
        { pattern: /без вложений.*доход/i, reason: 'Подозрительная схема' },
        { pattern: /пирамида|млм|сетевой/i, reason: 'MLM/пирамида' },
        { pattern: /кредитная.*карта.*номер/i, reason: 'Запрос финансовых данных' },
        { pattern: /перевести.*деньги.*вперёд/i, reason: 'Предоплата' }
      ];
      
      for (const { pattern, reason } of suspiciousPatterns) {
        if (pattern.test(text)) {
          issues.push({ type: 'suspicious_pattern', reason, severity: 'high' });
          if (status === 'ok') status = 'need_manual_review';
        }
      }
      
      if (price !== undefined && price !== null) {
        if (price <= 0) {
          issues.push({ type: 'invalid_price', reason: 'Цена должна быть больше 0', severity: 'medium' });
          if (status === 'ok') status = 'need_manual_review';
        } else if (price > 1000000) {
          issues.push({ type: 'suspicious_price', reason: 'Очень высокая цена', severity: 'low' });
        }
      }
      
      if (title && title.length < 5) {
        issues.push({ type: 'short_title', reason: 'Заголовок слишком короткий', severity: 'low' });
      }
      
      if (title && /[A-Z]{5,}/.test(title)) {
        issues.push({ type: 'caps_lock', reason: 'Много заглавных букв', severity: 'low' });
      }
      
      const contactPatterns = [
        /\+\d{10,}/,
        /\d{3}[-\s]?\d{3}[-\s]?\d{4}/,
        /@\w+\.\w+/,
        /telegram|whatsapp|viber/i
      ];
      
      for (const pattern of contactPatterns) {
        if (pattern.test(text)) {
          issues.push({ type: 'contact_in_text', reason: 'Контакты в тексте', severity: 'low' });
          break;
        }
      }
      
      return {
        success: true,
        data: {
          status,
          issues,
          recommendation: status === 'reject' 
            ? 'Объявление содержит запрещённый контент и будет отклонено.'
            : status === 'need_manual_review'
              ? 'Объявление требует ручной модерации.'
              : 'Объявление прошло автоматическую проверку.',
          moderatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('[AiEngine] autoModeration error:', error);
      return { success: false, error: error.message };
    }
  }

  async getSimilarAds(adId, limit = 10) {
    try {
      const sourceAd = await Ad.findById(adId).lean();
      if (!sourceAd) {
        return { success: false, error: 'Ad not found' };
      }
      
      const text = this.normalizeText(`${sourceAd.title} ${sourceAd.description || ''}`);
      const categoryInfo = await this.detectCategoryInfo(text);
      const keywords = this.extractKeywords(text);
      
      const query = {
        _id: { $ne: sourceAd._id },
        status: 'active',
        moderationStatus: 'approved'
      };
      
      if (sourceAd.categoryId) {
        query.categoryId = sourceAd.categoryId;
      }
      
      if (keywords.length > 0) {
        const keywordsRegex = keywords.slice(0, 5).join('|');
        query.$or = [
          { title: { $regex: keywordsRegex, $options: 'i' } },
          { tags: { $in: keywords.slice(0, 5) } }
        ];
      }
      
      const candidates = await Ad.find(query).limit(50).lean();
      
      const scored = candidates.map(ad => {
        let score = 0;
        const adText = this.normalizeText(`${ad.title} ${ad.description || ''}`);
        
        keywords.forEach(kw => {
          if (adText.includes(kw)) score += 5;
        });
        
        if (sourceAd.price && ad.price) {
          const priceDiff = Math.abs(sourceAd.price - ad.price) / sourceAd.price;
          if (priceDiff < 0.2) score += 3;
          else if (priceDiff < 0.5) score += 1;
        }
        
        if (sourceAd.location?.coordinates && ad.location?.coordinates) {
          const [srcLng, srcLat] = sourceAd.location.coordinates;
          const [adLng, adLat] = ad.location.coordinates;
          const R = 6371;
          const dLat = (adLat - srcLat) * Math.PI / 180;
          const dLon = (adLng - srcLng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(srcLat * Math.PI / 180) * Math.cos(adLat * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          
          if (distance < 5) score += 2;
          ad.distanceKm = Math.round(distance * 10) / 10;
        }
        
        ad.similarityScore = score;
        return ad;
      });
      
      scored.sort((a, b) => b.similarityScore - a.similarityScore);
      
      return {
        success: true,
        data: {
          similarAds: scored.slice(0, limit).map(ad => ({
            _id: ad._id.toString(),
            title: ad.title,
            price: ad.price,
            currency: ad.currency,
            photos: ad.photos,
            distanceKm: ad.distanceKm,
            similarityScore: ad.similarityScore
          })),
          sourceAdId: adId
        }
      };
    } catch (error) {
      console.error('[AiEngine] getSimilarAds error:', error);
      return { success: false, error: error.message };
    }
  }

  async improveAdText(ad) {
    try {
      const { title, description } = ad;
      
      let improvedTitle = title;
      let improvedDescription = description || '';
      
      improvedTitle = improvedTitle.trim();
      if (improvedTitle.length > 0) {
        improvedTitle = improvedTitle.charAt(0).toUpperCase() + improvedTitle.slice(1);
      }
      
      improvedTitle = improvedTitle.replace(/!{2,}/g, '!');
      improvedTitle = improvedTitle.replace(/\.{2,}/g, '...');
      
      if (/[A-ZА-Я]{5,}/.test(improvedTitle)) {
        improvedTitle = improvedTitle.toLowerCase();
        improvedTitle = improvedTitle.charAt(0).toUpperCase() + improvedTitle.slice(1);
      }
      
      if (improvedDescription) {
        improvedDescription = improvedDescription.trim();
        
        const sentences = improvedDescription.split(/(?<=[.!?])\s+/);
        improvedDescription = sentences.map(s => {
          s = s.trim();
          if (s.length > 0) {
            return s.charAt(0).toUpperCase() + s.slice(1);
          }
          return s;
        }).join(' ');
        
        improvedDescription = improvedDescription.replace(/\s{2,}/g, ' ');
      }
      
      const suggestions = [];
      
      if (title.length < 10) {
        suggestions.push('Добавьте больше деталей в заголовок (бренд, модель, размер)');
      }
      
      if (!description || description.length < 30) {
        suggestions.push('Расширьте описание — укажите состояние, причину продажи, комплектацию');
      }
      
      if (!title.match(/\b(новый|б\/у|хорошее|отличное|состояние)\b/i)) {
        suggestions.push('Укажите состояние товара в заголовке');
      }
      
      return {
        success: true,
        data: {
          improvedTitle,
          improvedDescription,
          suggestions,
          changes: {
            titleChanged: improvedTitle !== title,
            descriptionChanged: improvedDescription !== (description || '')
          }
        }
      };
    } catch (error) {
      console.error('[AiEngine] improveAdText error:', error);
      return { success: false, error: error.message };
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export default new AiEngine();
