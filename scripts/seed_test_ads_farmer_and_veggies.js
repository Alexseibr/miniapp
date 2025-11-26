import Ad from '../models/Ad.js';
import Category from '../models/Category.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const CENTER_BREST = {
  lat: 52.097622,
  lng: 23.734051,
};

const TEST_SELLER_ID = 374243315;

const BREST_DISTRICTS = [
  'Центр',
  'Вулька',
  'Ковалёво',
  'Гершоны',
  'Южный',
  'Речица',
  'Киевка',
];

const RURAL_LOCATIONS = [
  { name: 'д. Тельмы', distance: 8 },
  { name: 'д. Чернавчицы', distance: 12 },
  { name: 'д. Вистычи', distance: 15 },
  { name: 'д. Каменица-Жировецкая', distance: 10 },
  { name: 'д. Медно', distance: 18 },
  { name: 'д. Страдичи', distance: 7 },
  { name: 'д. Мотыкалы', distance: 14 },
  { name: 'д. Клейники', distance: 5 },
];

function offsetByDistance(centerLat, centerLng, distanceKm, bearingDeg) {
  const R = 6371;
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distanceKm / R) +
      Math.cos(latRad) * Math.sin(distanceKm / R) * Math.cos(bearingRad)
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceKm / R) * Math.cos(latRad),
      Math.cos(distanceKm / R) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}

const FARMER_PRODUCTS = [
  {
    title: '[ТЕСТ] Молодой картофель, урожай 2025',
    description: 'Свежий молодой картофель с собственного участка. Выращен без химии, только органические удобрения. Возможна доставка по городу.',
    price: 2.5,
    subcategory: 'farmer-potato',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Домашняя малина, 1 кг',
    description: 'Ароматная малина из собственного сада. Собрана сегодня утром. Отлично подходит для варенья и заморозки.',
    price: 15,
    subcategory: 'farmer-berries',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Свежий мёд разнотравье 2025',
    description: 'Натуральный мёд с семейной пасеки. Разнотравье, очень ароматный. Есть банки 0.5л и 1л. Доставка по договорённости.',
    price: 25,
    subcategory: 'farmer-honey',
    unitType: 'jar',
  },
  {
    title: '[ТЕСТ] Яйца деревенские, домашние куры',
    description: 'Свежие яйца от домашних кур. Куры на свободном выгуле, корм без добавок. Упаковка 10 шт или 30 шт.',
    price: 5,
    subcategory: 'farmer-dairy',
    unitType: 'pack',
  },
  {
    title: '[ТЕСТ] Огурцы свежие, грунтовые',
    description: 'Хрустящие огурцы с грядки. Идеальны для салата и засолки. Выращены без пестицидов.',
    price: 4,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Помидоры розовые, сладкие',
    description: 'Мясистые розовые помидоры с дачи. Сорт "Бычье сердце", очень сладкие и ароматные.',
    price: 7,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Капуста белокочанная, ранняя',
    description: 'Свежая ранняя капуста. Сочная, без химии. Вес кочана 2-3 кг. Самовывоз или доставка.',
    price: 2,
    subcategory: 'farmer-vegetables',
    unitType: 'piece',
  },
  {
    title: '[ТЕСТ] Укроп, петрушка - свежая зелень',
    description: 'Ароматная зелень с грядки. Пучки укропа и петрушки. Срезаем перед продажей.',
    price: 1.5,
    subcategory: 'farmer-greens',
    unitType: 'bunch',
  },
  {
    title: '[ТЕСТ] Домашнее молоко, козье',
    description: 'Свежее козье молоко. Коза здорова, все документы есть. Очень полезно для детей.',
    price: 8,
    subcategory: 'farmer-dairy',
    unitType: 'liter',
  },
  {
    title: '[ТЕСТ] Клубника свежая, Виктория',
    description: 'Сладкая клубника сорта Виктория. Крупная, ароматная. Собрана сегодня.',
    price: 12,
    subcategory: 'farmer-berries',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Морковь молодая, сладкая',
    description: 'Молодая сочная морковь. Выращена на чистом участке без химии. Идеальна для сока.',
    price: 3,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Творог домашний, жирный',
    description: 'Свежий домашний творог из цельного молока. Жирность 18%. Делаем каждый день.',
    price: 12,
    subcategory: 'farmer-dairy',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Чеснок озимый, сухой',
    description: 'Крупный озимый чеснок. Хорошо хранится. Собственный урожай, без обработки.',
    price: 15,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Смородина чёрная, свежая',
    description: 'Крупная чёрная смородина. Очень сладкая, идеальна для компота и варенья.',
    price: 10,
    subcategory: 'farmer-berries',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Рассада томатов, разные сорта',
    description: 'Крепкая рассада помидоров. Сорта: Бычье сердце, Черри, Розовый гигант. 10 шт в лотке.',
    price: 8,
    subcategory: 'farmer-plants',
    unitType: 'pack',
  },
];

const VEGETABLES_FRUITS = [
  {
    title: '[ТЕСТ] Яблоки Антоновка, домашние',
    description: 'Ароматные яблоки сорта Антоновка. Из собственного сада, без обработки. Отлично хранятся.',
    price: 3,
    subcategory: 'farmer-fruits',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Груши Конференция, сочные',
    description: 'Сладкие груши Конференция. Собраны на стадии технической зрелости, дозревают дома.',
    price: 5,
    subcategory: 'farmer-fruits',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Слива венгерка, на варенье',
    description: 'Спелая слива венгерка. Идеальна для варенья, компота, заморозки. Крупная, мясистая.',
    price: 4,
    subcategory: 'farmer-fruits',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Кабачки молодые, цукини',
    description: 'Нежные молодые кабачки цукини. Выращены без химии. Отлично для гриля и рагу.',
    price: 2.5,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Тыква мускатная, сладкая',
    description: 'Ароматная мускатная тыква. Очень сладкая, подходит для каши и выпечки. Вес 3-5 кг.',
    price: 3,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Лук репчатый, золотистый',
    description: 'Крупный репчатый лук золотистого цвета. Урожай 2025 года, хорошо хранится.',
    price: 2,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Свёкла столовая, бордо',
    description: 'Тёмная сладкая свёкла сорта Бордо. Выращена на чистом участке. Идеальна для борща.',
    price: 2.5,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Перец болгарский, красный',
    description: 'Сладкий болгарский перец красного цвета. Толстостенный, сочный. Из теплицы.',
    price: 8,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Вишня крупная, на варенье',
    description: 'Спелая крупная вишня. Сладкая с лёгкой кислинкой. Отлично для варенья и компота.',
    price: 8,
    subcategory: 'farmer-fruits',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Черника лесная, свежая',
    description: 'Свежесобранная лесная черника. Собрана вручную в экологически чистом районе.',
    price: 20,
    subcategory: 'farmer-berries',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Баклажаны фиолетовые, грунтовые',
    description: 'Свежие баклажаны с грядки. Без горечи, нежные. Идеальны для икры и запекания.',
    price: 6,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Редис красный, хрустящий',
    description: 'Сочный хрустящий редис. Пучок 20-25 штук. Выращен без химии.',
    price: 2,
    subcategory: 'farmer-vegetables',
    unitType: 'bunch',
  },
  {
    title: '[ТЕСТ] Брокколи свежая, головки',
    description: 'Свежая брокколи с дачи. Головки среднего размера. Очень полезный овощ.',
    price: 7,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Крыжовник спелый, зелёный',
    description: 'Крупный зелёный крыжовник. Сладкий, идеален для варенья и компота.',
    price: 6,
    subcategory: 'farmer-berries',
    unitType: 'kg',
  },
  {
    title: '[ТЕСТ] Абрикосы спелые, сладкие',
    description: 'Ароматные спелые абрикосы. Мягкие, сочные, сладкие. Из собственного сада.',
    price: 10,
    subcategory: 'farmer-fruits',
    unitType: 'kg',
  },
];

function generateCityAds(products, count = 7) {
  const ads = [];
  for (let i = 0; i < count; i++) {
    const product = products[i % products.length];
    const distance = 0.5 + Math.random() * 3.5;
    const bearing = Math.random() * 360;
    const coords = offsetByDistance(CENTER_BREST.lat, CENTER_BREST.lng, distance, bearing);
    const district = BREST_DISTRICTS[i % BREST_DISTRICTS.length];

    ads.push({
      ...product,
      location: coords,
      city: 'Брест',
      district: district,
      geoLabel: `Брест (${district})`,
      isCity: true,
      distanceFromCenter: distance,
    });
  }
  return ads;
}

function generateRuralAds(products, count = 8) {
  const ads = [];
  const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
  
  for (let i = 0; i < count; i++) {
    const product = products[(i + 7) % products.length];
    const rural = RURAL_LOCATIONS[i % RURAL_LOCATIONS.length];
    const baseBearing = bearings[i % bearings.length];
    const bearing = baseBearing + (Math.random() * 30 - 15);
    const distance = rural.distance + (Math.random() * 3 - 1.5);
    const coords = offsetByDistance(CENTER_BREST.lat, CENTER_BREST.lng, Math.max(5, distance), bearing);

    ads.push({
      ...product,
      location: coords,
      city: 'Брестский район',
      district: rural.name,
      geoLabel: `Брестский район (${rural.name})`,
      isCity: false,
      distanceFromCenter: distance,
    });
  }
  return ads;
}

async function seedTestAds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📍 Center point: Брест (${CENTER_BREST.lat}, ${CENTER_BREST.lng})\n`);

    const farmerCategory = await Category.findOne({ slug: 'farmer-market' });
    if (!farmerCategory) {
      throw new Error('Категория farmer-market не найдена!');
    }
    console.log(`✓ Найдена категория: ${farmerCategory.name}`);

    const subcategories = await Category.find({ parentSlug: 'farmer-market', isLeaf: true });
    const subcatMap = Object.fromEntries(subcategories.map((c) => [c.slug, c]));
    console.log(`✓ Найдено ${subcategories.length} подкатегорий\n`);

    console.log('🗑️  Удаляем старые тестовые объявления...');
    const deleteResult = await Ad.deleteMany({
      title: { $regex: /^\[ТЕСТ\]/ },
      categoryId: 'farmer-market',
    });
    console.log(`   Удалено: ${deleteResult.deletedCount} объявлений\n`);

    const farmerCityAds = generateCityAds(FARMER_PRODUCTS, 7);
    const farmerRuralAds = generateRuralAds(FARMER_PRODUCTS, 8);
    const vegetablesCityAds = generateCityAds(VEGETABLES_FRUITS, 7);
    const vegetablesRuralAds = generateRuralAds(VEGETABLES_FRUITS, 8);

    const allAds = [
      ...farmerCityAds,
      ...farmerRuralAds,
      ...vegetablesCityAds,
      ...vegetablesRuralAds,
    ];

    console.log('📦 Создаём объявления...\n');

    let created = 0;
    const adsToInsert = [];

    for (const adData of allAds) {
      const subcategory = subcatMap[adData.subcategory];
      if (!subcategory) {
        console.log(`⚠ Подкатегория ${adData.subcategory} не найдена, пропускаем...`);
        continue;
      }

      const ad = {
        title: adData.title,
        description: adData.description,
        categoryId: 'farmer-market',
        subcategoryId: adData.subcategory,
        price: adData.price,
        currency: 'BYN',
        unitType: adData.unitType || null,
        sellerTelegramId: TEST_SELLER_ID,
        city: adData.city,
        cityCode: 'brest',
        geoLabel: adData.geoLabel,
        location: {
          lat: adData.location.lat,
          lng: adData.location.lng,
          geo: {
            type: 'Point',
            coordinates: [adData.location.lng, adData.location.lat],
          },
        },
        status: 'active',
        moderationStatus: 'approved',
        isFarmerAd: true,
        photos: [],
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      };

      adsToInsert.push(ad);

      const distanceText =
        adData.distanceFromCenter < 1
          ? `${Math.round(adData.distanceFromCenter * 1000)}м`
          : `${adData.distanceFromCenter.toFixed(1)}км`;

      console.log(`  ✓ [${distanceText}] ${ad.title.substring(0, 40)}... — ${ad.geoLabel}`);
      created++;
    }

    if (adsToInsert.length > 0) {
      await Ad.insertMany(adsToInsert);
    }

    console.log('\n========================================');
    console.log('📊 ИТОГИ');
    console.log('========================================');
    console.log(`Всего создано: ${created} объявлений`);
    console.log(`  - Фермерский рынок (город): ${farmerCityAds.length}`);
    console.log(`  - Фермерский рынок (район): ${farmerRuralAds.length}`);
    console.log(`  - Овощи/фрукты (город): ${vegetablesCityAds.length}`);
    console.log(`  - Овощи/фрукты (район): ${vegetablesRuralAds.length}`);
    console.log(`\nТочка центра: Брест (${CENTER_BREST.lat}, ${CENTER_BREST.lng})`);
    console.log(`Продавец: @proService (${TEST_SELLER_ID})`);

    console.log('\n✅ Тестовые объявления созданы успешно!');
    console.log('\n🧪 Команды для проверки:');
    console.log(
      `GET /api/ads/nearby?lat=${CENTER_BREST.lat}&lng=${CENTER_BREST.lng}&radiusKm=5&categoryId=farmer-market`
    );
    console.log(
      `GET /api/ads/nearby?lat=${CENTER_BREST.lat}&lng=${CENTER_BREST.lng}&radiusKm=20&categoryId=farmer-market`
    );

    await mongoose.disconnect();
    console.log('\n✓ Соединение с БД закрыто');
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedTestAds();
