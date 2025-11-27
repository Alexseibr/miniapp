import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const searchAlertSchema = new mongoose.Schema({
  telegramId: String,
  userId: String,
  sessionId: String,
  query: String,
  normalizedQuery: String,
  detectedCategoryId: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number],
  },
  geoHash: String,
  radiusKm: { type: Number, default: 5 },
  citySlug: String,
  isActive: { type: Boolean, default: true },
  notifiedAt: Date,
  lastMatchedAdId: mongoose.Schema.Types.ObjectId,
  notificationsCount: { type: Number, default: 0 },
}, { timestamps: true });

const adSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  city: String,
  categoryId: String,
  subcategoryId: String,
  sellerTelegramId: String,
  status: String,
  location: {
    lat: Number,
    lng: Number,
    geo: {
      type: { type: String },
      coordinates: [Number],
    },
  },
}, { timestamps: true });

const SearchAlert = mongoose.models.SearchAlert || mongoose.model('SearchAlert', searchAlertSchema);
const Ad = mongoose.models.Ad || mongoose.model('Ad', adSchema);

async function testNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    console.log('=== 1. Проверка активных подписок на поиск ===\n');
    
    const activeAlerts = await SearchAlert.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    if (activeAlerts.length === 0) {
      console.log('❌ Нет активных подписок на уведомления о новых товарах.');
      console.log('\n💡 Чтобы создать подписку:');
      console.log('   1. Пользователь должен выполнить поиск, который не даёт результатов');
      console.log('   2. Или вручную подписаться на уведомления о товаре');
      console.log('\n📋 Создаём тестовую подписку...\n');
      
      const testAlert = new SearchAlert({
        telegramId: process.env.TEST_TELEGRAM_ID || '123456789',
        query: 'картошка',
        normalizedQuery: 'картошка',
        radiusKm: 10,
        isActive: true,
        location: {
          type: 'Point',
          coordinates: [27.5667, 53.9000],
        },
        geoHash: 'u9edr',
        citySlug: 'minsk',
      });
      
      await testAlert.save();
      console.log('✅ Тестовая подписка создана:', testAlert.query);
      activeAlerts.push(testAlert);
    }
    
    console.log(`📋 Найдено ${activeAlerts.length} активных подписок:\n`);
    
    for (const alert of activeAlerts) {
      const coords = alert.location?.coordinates;
      console.log(`   - "${alert.query}" (${alert.telegramId})`);
      console.log(`     Радиус: ${alert.radiusKm || 5} км`);
      if (coords && coords[0] !== 0) {
        console.log(`     Координаты: ${coords[1]?.toFixed(4)}, ${coords[0]?.toFixed(4)}`);
      }
      console.log(`     Уведомлений отправлено: ${alert.notificationsCount || 0}`);
      console.log(`     Последнее уведомление: ${alert.notifiedAt ? new Date(alert.notifiedAt).toLocaleString('ru-RU') : 'никогда'}`);
      console.log('');
    }

    console.log('\n=== 2. Поиск последних объявлений ===\n');
    
    const recentAds = await Ad.find({ 
      status: 'active',
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    console.log(`📦 Найдено ${recentAds.length} недавних объявлений:\n`);
    
    for (const ad of recentAds.slice(0, 5)) {
      console.log(`   - "${ad.title}" (${ad.price} руб.)`);
      console.log(`     Город: ${ad.city || 'не указан'}`);
      console.log(`     Продавец: ${ad.sellerTelegramId}`);
      console.log('');
    }

    console.log('\n=== 3. Симуляция проверки совпадений ===\n');
    
    for (const ad of recentAds.slice(0, 3)) {
      console.log(`🔍 Проверка объявления: "${ad.title}"`);
      
      const titleWords = (ad.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      let matchingAlerts = [];
      for (const alert of activeAlerts) {
        const queryWords = (alert.normalizedQuery || '').toLowerCase().split(/\s+/);
        
        const hasWordMatch = queryWords.some(qw => 
          titleWords.some(tw => tw.includes(qw) || qw.includes(tw))
        );
        
        if (hasWordMatch) {
          matchingAlerts.push(alert);
        }
      }
      
      if (matchingAlerts.length > 0) {
        console.log(`   ✅ Найдено ${matchingAlerts.length} совпадений!`);
        for (const match of matchingAlerts) {
          console.log(`      - Пользователь ${match.telegramId} искал "${match.query}"`);
        }
      } else {
        console.log(`   ❌ Нет совпадений с подписками`);
      }
      console.log('');
    }

    console.log('\n=== 4. Как это работает в реальности ===\n');
    console.log('Когда создаётся новое объявление, система:');
    console.log('1. Вызывает SearchAlertService.notifyMatchingUsers(ad, sendNotification)');
    console.log('2. Находит все активные подписки, которые соответствуют объявлению');
    console.log('3. Проверяет что не отправляла уведомление за последние 24 часа');
    console.log('4. Отправляет сообщение в Telegram:\n');
    console.log('   🔔 Появилось новое объявление!');
    console.log('   "Картошка домашняя 10 кг"');
    console.log('   💰 25 руб.');
    console.log('   📍 Минск');
    console.log('   Вы искали: "картошка"');
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Отключено от MongoDB');
  }
}

testNotifications();
