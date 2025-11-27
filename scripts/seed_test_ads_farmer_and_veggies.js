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
    photos: [
      'https://images.unsplash.com/photo-1518977676601-b53f82ber71c9?w=800&q=80',
      'https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Домашняя малина, 1 кг',
    description: 'Ароматная малина из собственного сада. Собрана сегодня утром. Отлично подходит для варенья и заморозки.',
    price: 15,
    subcategory: 'farmer-berries',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1577069861033-55d04cec4ef5?w=800&q=80',
      'https://images.unsplash.com/photo-1586074299757-dc655f18518c?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Свежий мёд разнотравье 2025',
    description: 'Натуральный мёд с семейной пасеки. Разнотравье, очень ароматный. Есть банки 0.5л и 1л. Доставка по договорённости.',
    price: 25,
    subcategory: 'farmer-honey',
    unitType: 'jar',
    photos: [
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80',
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Яйца деревенские, домашние куры',
    description: 'Свежие яйца от домашних кур. Куры на свободном выгуле, корм без добавок. Упаковка 10 шт или 30 шт.',
    price: 5,
    subcategory: 'farmer-dairy',
    unitType: 'pack',
    photos: [
      'https://images.unsplash.com/photo-1569288052389-dac9b01c9c05?w=800&q=80',
      'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Огурцы свежие, грунтовые',
    description: 'Хрустящие огурцы с грядки. Идеальны для салата и засолки. Выращены без пестицидов.',
    price: 4,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=800&q=80',
      'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Помидоры розовые, сладкие',
    description: 'Мясистые розовые помидоры с дачи. Сорт "Бычье сердце", очень сладкие и ароматные.',
    price: 7,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=800&q=80',
      'https://images.unsplash.com/photo-1561136594-7f68413baa99?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Капуста белокочанная, ранняя',
    description: 'Свежая ранняя капуста. Сочная, без химии. Вес кочана 2-3 кг. Самовывоз или доставка.',
    price: 2,
    subcategory: 'farmer-vegetables',
    unitType: 'piece',
    photos: [
      'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=800&q=80',
      'https://images.unsplash.com/photo-1625865604460-e998ac8ec3d4?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Укроп, петрушка - свежая зелень',
    description: 'Ароматная зелень с грядки. Пучки укропа и петрушки. Срезаем перед продажей.',
    price: 1.5,
    subcategory: 'farmer-greens',
    unitType: 'bunch',
    photos: [
      'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=80',
      'https://images.unsplash.com/photo-1592485099637-a25e66b16be9?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Домашнее молоко, козье',
    description: 'Свежее козье молоко. Коза здорова, все документы есть. Очень полезно для детей.',
    price: 8,
    subcategory: 'farmer-dairy',
    unitType: 'liter',
    photos: [
      'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800&q=80',
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Клубника свежая, Виктория',
    description: 'Сладкая клубника сорта Виктория. Крупная, ароматная. Собрана сегодня.',
    price: 12,
    subcategory: 'farmer-berries',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&q=80',
      'https://images.unsplash.com/photo-1543528176-61b239494933?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Морковь молодая, сладкая',
    description: 'Молодая сочная морковь. Выращена на чистом участке без химии. Идеальна для сока.',
    price: 3,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800&q=80',
      'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Творог домашний, жирный',
    description: 'Свежий домашний творог из цельного молока. Жирность 18%. Делаем каждый день.',
    price: 12,
    subcategory: 'farmer-dairy',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800&q=80',
      'https://images.unsplash.com/photo-1559561853-08451507cbe7?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Чеснок озимый, сухой',
    description: 'Крупный озимый чеснок. Хорошо хранится. Собственный урожай, без обработки.',
    price: 15,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=800&q=80',
      'https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Смородина чёрная, свежая',
    description: 'Крупная чёрная смородина. Очень сладкая, идеальна для компота и варенья.',
    price: 10,
    subcategory: 'farmer-berries',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1563746098251-d35aef196e83?w=800&q=80',
      'https://images.unsplash.com/photo-1595412607744-e0c3ae38ad99?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Рассада томатов, разные сорта',
    description: 'Крепкая рассада помидоров. Сорта: Бычье сердце, Черри, Розовый гигант. 10 шт в лотке.',
    price: 8,
    subcategory: 'farmer-plants',
    unitType: 'pack',
    photos: [
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
      'https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=800&q=80',
    ],
  },
];

const VEGETABLES_FRUITS = [
  {
    title: '[ТЕСТ] Яблоки Антоновка, домашние',
    description: 'Ароматные яблоки сорта Антоновка. Из собственного сада, без обработки. Отлично хранятся.',
    price: 3,
    subcategory: 'farmer-fruits',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&q=80',
      'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Груши Конференция, сочные',
    description: 'Сладкие груши Конференция. Собраны на стадии технической зрелости, дозревают дома.',
    price: 5,
    subcategory: 'farmer-fruits',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=800&q=80',
      'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Слива венгерка, на варенье',
    description: 'Спелая слива венгерка. Идеальна для варенья, компота, заморозки. Крупная, мясистая.',
    price: 4,
    subcategory: 'farmer-fruits',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&q=80',
      'https://images.unsplash.com/photo-1596363505729-4190a9506133?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Кабачки молодые, цукини',
    description: 'Нежные молодые кабачки цукини. Выращены без химии. Отлично для гриля и рагу.',
    price: 2.5,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1563252722-6434563a985c?w=800&q=80',
      'https://images.unsplash.com/photo-1596127228159-7fc4a7d7bf91?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Тыква мускатная, сладкая',
    description: 'Ароматная мускатная тыква. Очень сладкая, подходит для каши и выпечки. Вес 3-5 кг.',
    price: 3,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=800&q=80',
      'https://images.unsplash.com/photo-1509622905150-fa66d3906e09?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Лук репчатый, золотистый',
    description: 'Крупный репчатый лук золотистого цвета. Урожай 2025 года, хорошо хранится.',
    price: 2,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1508747703725-719f0f6c450d?w=800&q=80',
      'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Свёкла столовая, бордо',
    description: 'Тёмная сладкая свёкла сорта Бордо. Выращена на чистом участке. Идеальна для борща.',
    price: 2.5,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=800&q=80',
      'https://images.unsplash.com/photo-1627738668643-1c166aecdffc?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Перец болгарский, красный',
    description: 'Сладкий болгарский перец красного цвета. Толстостенный, сочный. Из теплицы.',
    price: 8,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&q=80',
      'https://images.unsplash.com/photo-1601648764658-cf37e8c89b70?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Вишня крупная, на варенье',
    description: 'Спелая крупная вишня. Сладкая с лёгкой кислинкой. Отлично для варенья и компота.',
    price: 8,
    subcategory: 'farmer-fruits',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=800&q=80',
      'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Черника лесная, свежая',
    description: 'Свежесобранная лесная черника. Собрана вручную в экологически чистом районе.',
    price: 20,
    subcategory: 'farmer-berries',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=800&q=80',
      'https://images.unsplash.com/photo-1457296898342-cdd24585d095?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Баклажаны фиолетовые, грунтовые',
    description: 'Свежие баклажаны с грядки. Без горечи, нежные. Идеальны для икры и запекания.',
    price: 6,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1615484477408-66fdc7e7a67a?w=800&q=80',
      'https://images.unsplash.com/photo-1605197161470-5f3fc99e7f8c?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Редис красный, хрустящий',
    description: 'Сочный хрустящий редис. Пучок 20-25 штук. Выращен без химии.',
    price: 2,
    subcategory: 'farmer-vegetables',
    unitType: 'bunch',
    photos: [
      'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=800&q=80',
      'https://images.unsplash.com/photo-1594282486756-576b55ff0df1?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Брокколи свежая, головки',
    description: 'Свежая брокколи с дачи. Головки среднего размера. Очень полезный овощ.',
    price: 7,
    subcategory: 'farmer-vegetables',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&q=80',
      'https://images.unsplash.com/photo-1628773822503-930a7eaecf80?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Крыжовник спелый, зелёный',
    description: 'Крупный зелёный крыжовник. Сладкий, идеален для варенья и компота.',
    price: 6,
    subcategory: 'farmer-berries',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1593400521784-30f8f6c2d01a?w=800&q=80',
      'https://images.unsplash.com/photo-1596096299770-e1b13df770f8?w=800&q=80',
    ],
  },
  {
    title: '[ТЕСТ] Абрикосы спелые, сладкие',
    description: 'Ароматные спелые абрикосы. Мягкие, сочные, сладкие. Из собственного сада.',
    price: 10,
    subcategory: 'farmer-fruits',
    unitType: 'kg',
    photos: [
      'https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=800&q=80',
      'https://images.unsplash.com/photo-1592681814168-6df0fa93161b?w=800&q=80',
    ],
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
        currency: 'RUB',
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
        photos: adData.photos || [],
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
