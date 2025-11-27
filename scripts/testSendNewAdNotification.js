import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';

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
  moderationStatus: String,
  location: {
    lat: Number,
    lng: Number,
    geo: {
      type: { type: String },
      coordinates: [Number],
    },
  },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  telegramId: Number,
  firstName: String,
  lastName: String,
  username: String,
}, { timestamps: true });

const SearchAlert = mongoose.models.SearchAlert || mongoose.model('SearchAlert', searchAlertSchema);
const Ad = mongoose.models.Ad || mongoose.model('Ad', adSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

function normalizeQuery(query) {
  const STOP_WORDS = new Set([
    'куплю', 'продам', 'ищу', 'нужен', 'нужна', 'нужно', 'срочно', 'недорого',
    'дёшево', 'дешево', 'бу', 'б/у', 'новый', 'новая', 'новое', 'хочу',
    'и', 'в', 'на', 'с', 'по', 'для', 'от', 'до', 'за', 'из', 'к', 'у', 'о',
  ]);
  
  if (!query) return '';
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .join(' ');
}

async function testRealNotification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    console.log('=== 1. Поиск реальных пользователей ===\n');
    
    const users = await User.find({ telegramId: { $exists: true, $ne: null } })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    console.log(`Найдено ${users.length} пользователей:\n`);
    for (const user of users) {
      console.log(`   - ${user.firstName || 'Unknown'} (ID: ${user.telegramId})`);
    }

    if (users.length === 0) {
      console.log('❌ Нет пользователей для тестирования');
      return;
    }

    const testUser = users[0];
    console.log(`\n✅ Будем тестировать с пользователем: ${testUser.firstName} (${testUser.telegramId})\n`);

    console.log('=== 2. Создание тестовой подписки ===\n');
    
    const testProducts = ['малина', 'яблоки', 'картошка', 'молоко', 'мёд'];
    const randomProduct = testProducts[Math.floor(Math.random() * testProducts.length)];
    
    let alert = await SearchAlert.findOne({ 
      telegramId: String(testUser.telegramId),
      isActive: true 
    });
    
    if (!alert) {
      alert = new SearchAlert({
        telegramId: String(testUser.telegramId),
        query: randomProduct,
        normalizedQuery: randomProduct,
        radiusKm: 50,
        isActive: true,
        location: {
          type: 'Point',
          coordinates: [27.5667, 53.9000],
        },
        geoHash: 'u9edr',
        citySlug: 'minsk',
      });
      await alert.save();
      console.log(`✅ Создана подписка: "${randomProduct}"`);
    } else {
      console.log(`📋 Уже есть подписка: "${alert.query}"`);
    }

    console.log('\n=== 3. Поиск подходящего объявления ===\n');

    const queryWords = normalizeQuery(alert.query).split(' ').filter(w => w.length > 2);
    const wordPatterns = queryWords.map(w => new RegExp(w, 'i'));
    
    const matchingAd = await Ad.findOne({
      status: 'active',
      $or: wordPatterns.map(pattern => ({ title: pattern })),
    }).lean();

    if (!matchingAd) {
      console.log(`❌ Нет объявлений, подходящих под запрос "${alert.query}"`);
      console.log('\n📦 Последние объявления:');
      const recentAds = await Ad.find({ status: 'active' }).sort({ createdAt: -1 }).limit(5).lean();
      for (const ad of recentAds) {
        console.log(`   - "${ad.title}" (${ad.price} руб.)`);
      }
      
      if (recentAds.length > 0) {
        console.log('\n🔄 Обновляем подписку на первое найденное объявление...');
        const firstAd = recentAds[0];
        const newQuery = firstAd.title.toLowerCase().split(' ')[0];
        alert.query = newQuery;
        alert.normalizedQuery = newQuery;
        alert.notifiedAt = null;
        await alert.save();
        console.log(`✅ Подписка обновлена на: "${newQuery}"`);
      }
    } else {
      console.log(`✅ Найдено подходящее объявление: "${matchingAd.title}"`);
    }

    console.log('\n=== 4. ОТПРАВКА ТЕСТОВОГО УВЕДОМЛЕНИЯ ===\n');
    
    const adToNotify = matchingAd || await Ad.findOne({ status: 'active' }).sort({ createdAt: -1 }).lean();
    
    if (!adToNotify) {
      console.log('❌ Нет активных объявлений для уведомления');
      return;
    }
    
    const message = `🔔 <b>Появилось новое объявление!</b>

📦 "${adToNotify.title}"
💰 ${adToNotify.price || 0} руб.
${adToNotify.city ? `📍 ${adToNotify.city}` : ''}

Вы искали: "${alert.query}"

👉 <a href="https://t.me/KetmarM_bot?startapp=ad_${adToNotify._id}">Открыть объявление</a>`;

    console.log('Сообщение:');
    console.log('─'.repeat(50));
    console.log(message.replace(/<[^>]+>/g, ''));
    console.log('─'.repeat(50));
    
    console.log(`\n📤 Отправка пользователю ${testUser.telegramId}...`);
    
    try {
      await bot.telegram.sendMessage(testUser.telegramId, message, { 
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
      
      console.log('✅ УВЕДОМЛЕНИЕ УСПЕШНО ОТПРАВЛЕНО!\n');
      
      await SearchAlert.updateOne(
        { _id: alert._id },
        { 
          notifiedAt: new Date(),
          lastMatchedAdId: adToNotify._id,
          $inc: { notificationsCount: 1 },
        }
      );
      console.log('📝 Статус подписки обновлён');
      
    } catch (sendError) {
      console.error('❌ Ошибка отправки:', sendError.message);
      
      if (sendError.message.includes('blocked') || sendError.message.includes('deactivated')) {
        console.log('   Пользователь заблокировал бота или деактивирован');
      }
    }

    console.log('\n=== 5. Итоговая статистика подписок ===\n');
    
    const stats = await SearchAlert.aggregate([
      { $match: { isActive: true } },
      { 
        $group: { 
          _id: null, 
          total: { $sum: 1 },
          withNotifications: { $sum: { $cond: [{ $gt: ['$notificationsCount', 0] }, 1, 0] } },
          totalNotifications: { $sum: '$notificationsCount' },
        } 
      },
    ]);
    
    if (stats.length > 0) {
      console.log(`📊 Всего активных подписок: ${stats[0].total}`);
      console.log(`📬 С отправленными уведомлениями: ${stats[0].withNotifications}`);
      console.log(`✉️ Всего уведомлений отправлено: ${stats[0].totalNotifications}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Отключено от MongoDB');
  }
}

testRealNotification();
