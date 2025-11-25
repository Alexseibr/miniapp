import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.js';

dotenv.config();

const FARMER_ROOT = {
  slug: 'farmer-market',
  name: 'Фермерский рынок',
  level: 1,
  isLeaf: false,
  isFarmerCategory: true,
  type: 'agro',
  sortOrder: 1,
  icon3d: '/attached_assets/icons3d/farmer.webp',
};

const FARMER_SUBCATEGORIES = [
  {
    slug: 'farmer-vegetables',
    name: 'Овощи',
    unitTypes: ['kg', 'piece', 'bag'],
    defaultUnit: 'kg',
    keywordTokens: ['овощ', 'помидор', 'огурец', 'морковь', 'свекла', 'капуста', 'лук', 'чеснок', 'перец', 'баклажан', 'кабачок', 'тыква', 'редис', 'репа'],
    sortOrder: 1,
  },
  {
    slug: 'farmer-fruits',
    name: 'Фрукты',
    unitTypes: ['kg', 'piece'],
    defaultUnit: 'kg',
    keywordTokens: ['фрукт', 'яблоко', 'груша', 'слива', 'абрикос', 'персик', 'вишня', 'черешня', 'виноград', 'алыча'],
    sortOrder: 2,
  },
  {
    slug: 'farmer-berries',
    name: 'Ягоды',
    unitTypes: ['kg', 'g', 'liter', 'pack'],
    defaultUnit: 'kg',
    keywordTokens: ['ягод', 'клубника', 'малина', 'черника', 'голубика', 'ежевика', 'смородина', 'крыжовник', 'земляника', 'брусника', 'клюква', 'арбуз', 'дыня'],
    sortOrder: 3,
  },
  {
    slug: 'farmer-greens',
    name: 'Зелень',
    unitTypes: ['bunch', 'g', 'kg'],
    defaultUnit: 'bunch',
    keywordTokens: ['зелень', 'укроп', 'петрушка', 'кинза', 'базилик', 'салат', 'шпинат', 'руккола', 'мята', 'щавель', 'лук-порей', 'сельдерей'],
    sortOrder: 4,
  },
  {
    slug: 'farmer-potato',
    name: 'Картофель',
    unitTypes: ['kg', 'bag'],
    defaultUnit: 'kg',
    keywordTokens: ['картофель', 'картошка', 'бульба', 'картоха', 'молодая картошка'],
    sortOrder: 5,
  },
  {
    slug: 'farmer-canning',
    name: 'Домашняя консервация',
    unitTypes: ['jar', 'liter', 'piece'],
    defaultUnit: 'jar',
    keywordTokens: ['консерв', 'варенье', 'соленье', 'компот', 'маринад', 'закатка', 'заготовка', 'огурчики', 'помидорчики', 'лечо', 'аджика', 'джем', 'повидло'],
    sortOrder: 6,
  },
  {
    slug: 'farmer-honey',
    name: 'Мёд и пчелопродукция',
    unitTypes: ['kg', 'liter', 'jar'],
    defaultUnit: 'kg',
    keywordTokens: ['мёд', 'мед', 'прополис', 'перга', 'пыльца', 'воск', 'соты', 'забрус', 'маточное молочко', 'пчелопродукт', 'липовый', 'гречишный', 'цветочный', 'акациевый'],
    sortOrder: 7,
  },
  {
    slug: 'farmer-dairy',
    name: 'Молочка и яйца',
    unitTypes: ['liter', 'kg', 'piece', 'pack'],
    defaultUnit: 'liter',
    keywordTokens: ['молоко', 'молочк', 'сметана', 'творог', 'сыр', 'масло', 'кефир', 'ряженка', 'йогурт', 'яйцо', 'яйца', 'домашние яйца', 'деревенские', 'фермерские'],
    sortOrder: 8,
  },
  {
    slug: 'farmer-meat',
    name: 'Мясо, птица, рыба',
    unitTypes: ['kg', 'piece'],
    defaultUnit: 'kg',
    keywordTokens: ['мясо', 'птица', 'рыба', 'свинина', 'говядина', 'баранина', 'курица', 'утка', 'гусь', 'индейка', 'кролик', 'перепел', 'филе', 'фарш', 'колбаса', 'сало', 'карп', 'щука', 'сом', 'форель'],
    sortOrder: 9,
  },
  {
    slug: 'farmer-plants',
    name: 'Растения и рассада',
    unitTypes: ['piece', 'pack'],
    defaultUnit: 'piece',
    keywordTokens: ['рассада', 'саженец', 'семена', 'растение', 'цветок', 'куст', 'дерево', 'роза', 'туя', 'помидор рассада', 'огурец рассада', 'перец рассада', 'клубника рассада'],
    sortOrder: 10,
  },
  {
    slug: 'farmer-feed',
    name: 'Сено, зерно, корма',
    unitTypes: ['kg', 'bag', 'pack'],
    defaultUnit: 'kg',
    keywordTokens: ['сено', 'зерно', 'корм', 'комбикорм', 'солома', 'овёс', 'пшеница', 'ячмень', 'кукуруза', 'отруби', 'жмых', 'силос'],
    sortOrder: 11,
  },
];

const SEASONAL_CATEGORIES = [
  {
    slug: 'farmer-seasonal-valentine',
    name: 'Ярмарка 14 февраля',
    keywordTokens: ['валентин', '14 февраля', 'любовь', 'сердце', 'романтик'],
    seasonStart: new Date(new Date().getFullYear(), 1, 1),
    seasonEnd: new Date(new Date().getFullYear(), 1, 15),
    sortOrder: 1,
  },
  {
    slug: 'farmer-seasonal-march8',
    name: 'Ярмарка 8 марта',
    keywordTokens: ['8 марта', 'тюльпан', 'мимоза', 'букет', 'цветы', 'женский день'],
    seasonStart: new Date(new Date().getFullYear(), 2, 1),
    seasonEnd: new Date(new Date().getFullYear(), 2, 9),
    sortOrder: 2,
  },
  {
    slug: 'farmer-seasonal-easter',
    name: 'Пасха',
    keywordTokens: ['пасха', 'кулич', 'пасхальн', 'крашенк', 'писанк', 'яйца пасхальные'],
    seasonStart: new Date(new Date().getFullYear(), 3, 1),
    seasonEnd: new Date(new Date().getFullYear(), 4, 15),
    sortOrder: 3,
  },
  {
    slug: 'farmer-seasonal-harvest',
    name: 'Урожайная ярмарка',
    keywordTokens: ['урожай', 'сезон', 'свежий урожай', 'осенний'],
    seasonStart: new Date(new Date().getFullYear(), 7, 15),
    seasonEnd: new Date(new Date().getFullYear(), 10, 1),
    sortOrder: 4,
  },
  {
    slug: 'farmer-seasonal-newyear',
    name: 'Новогодняя ярмарка',
    keywordTokens: ['новый год', 'новогодн', 'ёлка', 'елка', 'рождеств', 'подарок', 'игрушка'],
    seasonStart: new Date(new Date().getFullYear(), 11, 1),
    seasonEnd: new Date(new Date().getFullYear() + 1, 0, 15),
    sortOrder: 5,
  },
];

async function addFarmerCategories() {
  console.log('[Migration] Starting farmer categories migration...');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Migration] Connected to MongoDB');

    let createdRoot = false;
    let rootCategory = await Category.findOne({ slug: FARMER_ROOT.slug });
    
    if (!rootCategory) {
      rootCategory = new Category(FARMER_ROOT);
      await rootCategory.save();
      createdRoot = true;
      console.log(`[Migration] Created root category: ${FARMER_ROOT.name}`);
    } else {
      rootCategory.isFarmerCategory = true;
      rootCategory.type = 'agro';
      await rootCategory.save();
      console.log(`[Migration] Updated root category: ${FARMER_ROOT.name}`);
    }

    let createdSubs = 0;
    let updatedSubs = 0;

    for (const sub of FARMER_SUBCATEGORIES) {
      const existing = await Category.findOne({ slug: sub.slug });
      
      if (existing) {
        existing.isFarmerCategory = true;
        existing.unitTypes = sub.unitTypes;
        existing.defaultUnit = sub.defaultUnit;
        existing.keywordTokens = sub.keywordTokens;
        await existing.save();
        updatedSubs++;
        console.log(`[Migration] Updated: ${sub.name}`);
      } else {
        const newCat = new Category({
          ...sub,
          parentSlug: FARMER_ROOT.slug,
          level: 2,
          isLeaf: true,
          isFarmerCategory: true,
          isActive: true,
          type: 'agro',
        });
        await newCat.save();
        createdSubs++;
        console.log(`[Migration] Created: ${sub.name}`);
      }
    }

    const otherSlug = 'farmer-other';
    const existingOther = await Category.findOne({ slug: otherSlug });
    
    if (!existingOther) {
      const otherCat = new Category({
        slug: otherSlug,
        name: 'Другое (Фермерское)',
        parentSlug: FARMER_ROOT.slug,
        level: 2,
        isLeaf: true,
        isOther: true,
        isFarmerCategory: true,
        isActive: true,
        type: 'agro',
        sortOrder: 99,
        keywordTokens: ['другое', 'прочее', 'разное'],
      });
      await otherCat.save();
      console.log('[Migration] Created: Другое (Фермерское)');
    }

    const seasonalRootSlug = 'farmer-seasonal';
    let seasonalRoot = await Category.findOne({ slug: seasonalRootSlug });
    
    if (!seasonalRoot) {
      seasonalRoot = new Category({
        slug: seasonalRootSlug,
        name: 'Сезонные товары',
        parentSlug: FARMER_ROOT.slug,
        level: 2,
        isLeaf: false,
        isFarmerCategory: true,
        isSeasonal: true,
        isActive: true,
        type: 'agro',
        sortOrder: 12,
        keywordTokens: ['сезон', 'праздник', 'ярмарка'],
      });
      await seasonalRoot.save();
      console.log('[Migration] Created: Сезонные товары');
    }

    let createdSeasonal = 0;
    for (const seasonal of SEASONAL_CATEGORIES) {
      const existing = await Category.findOne({ slug: seasonal.slug });
      
      if (!existing) {
        const newCat = new Category({
          ...seasonal,
          parentSlug: seasonalRootSlug,
          level: 3,
          isLeaf: true,
          isFarmerCategory: true,
          isSeasonal: true,
          isActive: true,
          type: 'agro',
          unitTypes: ['piece', 'bunch', 'pack'],
          defaultUnit: 'piece',
        });
        await newCat.save();
        createdSeasonal++;
        console.log(`[Migration] Created seasonal: ${seasonal.name}`);
      } else {
        existing.isSeasonal = true;
        existing.seasonStart = seasonal.seasonStart;
        existing.seasonEnd = seasonal.seasonEnd;
        existing.isFarmerCategory = true;
        await existing.save();
        console.log(`[Migration] Updated seasonal: ${seasonal.name}`);
      }
    }

    console.log(`\n[Migration] Complete!`);
    console.log(`  Root: ${createdRoot ? 'created' : 'updated'}`);
    console.log(`  Subcategories: ${createdSubs} created, ${updatedSubs} updated`);
    console.log(`  Seasonal: ${createdSeasonal} created`);

    const allFarmer = await Category.find({ isFarmerCategory: true }).select('slug name level isSeasonal');
    console.log('\n[Migration] All farmer categories:');
    allFarmer.forEach(cat => {
      const indent = '  '.repeat(cat.level);
      const seasonal = cat.isSeasonal ? ' (сезонная)' : '';
      console.log(`${indent}${cat.slug}: "${cat.name}"${seasonal}`);
    });

  } catch (error) {
    console.error('[Migration] Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n[Migration] Disconnected from MongoDB');
  }
}

addFarmerCategories()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
