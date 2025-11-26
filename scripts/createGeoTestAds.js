import Ad from '../models/Ad.js';
import Category from '../models/Category.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const CENTER_POINT = {
  lat: 52.093752,
  lng: 23.688094,
  city: 'Брест',
};

const TEST_SELLER_ID = 374243315;

function offsetCoordinates(lat, lng, distanceKm, bearing = 45) {
  const R = 6371;
  const bearingRad = (bearing * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(distanceKm / R) +
    Math.cos(latRad) * Math.sin(distanceKm / R) * Math.cos(bearingRad)
  );
  
  const newLngRad = lngRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distanceKm / R) * Math.cos(latRad),
    Math.cos(distanceKm / R) - Math.sin(latRad) * Math.sin(newLatRad)
  );
  
  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}

const geoTestAds = [
  {
    distance: 0.1,
    bearing: 0,
    title: 'iPhone 15 Pro 256GB, новый',
    description: 'Новый iPhone 15 Pro 256GB, Natural Titanium. Запечатан, чек, гарантия Apple. Продаю срочно, торг.',
    price: 2400,
    categorySlug: 'smartfony',
  },
  {
    distance: 0.3,
    bearing: 90,
    title: 'MacBook Air M2 16GB/512GB',
    description: 'MacBook Air M2, конфигурация 16/512. Цвет Midnight. Состояние идеальное, куплен 2 месяца назад. Полный комплект.',
    price: 2800,
    categorySlug: 'noutbuki-kompyutery',
  },
  {
    distance: 0.5,
    bearing: 180,
    title: 'Samsung Galaxy S24+ 256GB',
    description: 'Samsung Galaxy S24+ в отличном состоянии. Память 256GB, цвет Onyx Black. Защитное стекло, чехол в подарок.',
    price: 1600,
    categorySlug: 'smartfony',
  },
  {
    distance: 0.8,
    bearing: 270,
    title: 'AirPods Pro 2 USB-C, запечатаны',
    description: 'AirPods Pro второго поколения с USB-C зарядкой. Новые, в плёнке. Куплены в iSpace, есть чек.',
    price: 450,
    categorySlug: 'audio-tehnika',
  },
  {
    distance: 1.2,
    bearing: 45,
    title: 'iPad Pro 11" M4 256GB Wi-Fi',
    description: 'Новый iPad Pro 11 дюймов с чипом M4. Память 256GB, Wi-Fi, цвет Space Black. Запечатан.',
    price: 1900,
    categorySlug: 'planshety',
  },
  {
    distance: 2.0,
    bearing: 135,
    title: 'Apple Watch Series 9 45mm GPS',
    description: 'Apple Watch Series 9 корпус 45mm, GPS. Цвет Midnight Aluminum. Состояние отличное, пользовался 3 месяца.',
    price: 720,
    categorySlug: 'aksessuary',
  },
  {
    distance: 3.5,
    bearing: 225,
    title: 'Dell XPS 15 i7/32GB/1TB RTX 4050',
    description: 'Мощный ноутбук Dell XPS 15. Intel Core i7-13700H, 32GB RAM, 1TB SSD, NVIDIA RTX 4050. Экран 15.6" 3.5K OLED.',
    price: 3500,
    categorySlug: 'noutbuki-kompyutery',
  },
  {
    distance: 5.0,
    bearing: 315,
    title: 'Sony WH-1000XM5, чёрные',
    description: 'Флагманские наушники Sony WH-1000XM5 с активным шумоподавлением. Цвет чёрный. Состояние идеальное.',
    price: 580,
    categorySlug: 'audio-tehnika',
  },
  {
    distance: 7.5,
    bearing: 30,
    title: 'Xiaomi 14 Pro 12/512GB, титан',
    description: 'Xiaomi 14 Pro в топовой конфигурации. 12GB RAM, 512GB storage. Leica камера, быстрая зарядка 120W.',
    price: 1400,
    categorySlug: 'smartfony',
  },
  {
    distance: 10.0,
    bearing: 150,
    title: 'Lenovo Legion 5 Pro RTX 4070',
    description: 'Игровой ноутбук Lenovo Legion 5 Pro. Ryzen 7 7745HX, 32GB DDR5, RTX 4070 8GB, экран 165Hz QHD.',
    price: 2900,
    categorySlug: 'noutbuki-kompyutery',
  },
  {
    distance: 0.05,
    bearing: 200,
    title: 'AirTag 4 шт., новые',
    description: 'Набор из 4 AirTag Apple. Новые, запечатанные. Идеально для поиска ключей, сумок, багажа.',
    price: 180,
    categorySlug: 'aksessuary',
  },
  {
    distance: 1.8,
    bearing: 100,
    title: 'Nintendo Switch OLED, белая',
    description: 'Nintendo Switch OLED модель, цвет белый. Состояние отличное, комплект полный с док-станцией.',
    price: 620,
    categorySlug: 'igry-igrovye-pristavki',
  },
  {
    distance: 4.2,
    bearing: 280,
    title: 'DJI Mini 4 Pro Fly More Combo',
    description: 'Дрон DJI Mini 4 Pro в комплектации Fly More Combo. 3 батареи, кейс, все аксессуары. Состояние как новый.',
    price: 1850,
    categorySlug: 'tv-foto-video',
  },
];

async function createGeoTestAds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📍 Center point: ${CENTER_POINT.city} (${CENTER_POINT.lat}, ${CENTER_POINT.lng})\n`);
    
    const categories = await Category.find({ isLeaf: true }).select('slug name');
    const categoryMap = Object.fromEntries(categories.map(c => [c.slug, c]));
    
    let created = 0;
    const summary = [];
    
    for (const adData of geoTestAds) {
      const category = categoryMap[adData.categorySlug];
      if (!category) {
        console.log(`⚠ Category ${adData.categorySlug} not found, skipping...`);
        continue;
      }
      
      const coords = offsetCoordinates(
        CENTER_POINT.lat,
        CENTER_POINT.lng,
        adData.distance,
        adData.bearing
      );
      
      const ad = {
        title: adData.title,
        description: adData.description,
        categoryId: category.slug,
        subcategoryId: category.slug,
        price: adData.price,
        currency: 'RUB',
        sellerTelegramId: TEST_SELLER_ID,
        city: CENTER_POINT.city,
        cityCode: 'brest',
        location: {
          lat: coords.lat,
          lng: coords.lng,
          geo: {
            type: 'Point',
            coordinates: [coords.lng, coords.lat],
          },
        },
        status: 'active',
        moderationStatus: 'approved',
        photos: [],
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      };
      
      const result = await Ad.create(ad);
      created++;
      
      const distanceText = adData.distance < 1 
        ? `${Math.round(adData.distance * 1000)}м` 
        : `${adData.distance.toFixed(1)}км`;
      
      console.log(`✓ [${distanceText}] ${ad.title} - ${ad.price} руб.`);
      summary.push({
        id: result._id,
        distance: distanceText,
        title: ad.title,
        price: ad.price,
      });
    }
    
    console.log('\n========================================');
    console.log('📊 SUMMARY');
    console.log('========================================');
    console.log(`Total ads created: ${created}`);
    console.log(`Center point: ${CENTER_POINT.city} (${CENTER_POINT.lat}, ${CENTER_POINT.lng})`);
    console.log(`Seller: @proService (${TEST_SELLER_ID})`);
    console.log('\n✅ Geo test ads created successfully!');
    console.log('\n🧪 Test commands:');
    console.log(`GET /api/ads/search?lat=${CENTER_POINT.lat}&lng=${CENTER_POINT.lng}&radiusKm=1`);
    console.log(`GET /api/ads/search?lat=${CENTER_POINT.lat}&lng=${CENTER_POINT.lng}&radiusKm=5&sort=distance`);
    console.log(`GET /api/ads/search?lat=${CENTER_POINT.lat}&lng=${CENTER_POINT.lng}&radiusKm=10&sort=distance`);
    
    await mongoose.disconnect();
    console.log('\n✓ Database disconnected');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createGeoTestAds();
