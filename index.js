const config = require('./config/config.js');
const connectDB = require('./services/db.js');
const app = require('./api/server.js');
const bot = require('./bot/bot.js');
const { checkFavoritesForChanges } = require('./notifications/watcher');

const PORT = config.port;

// Главная функция запуска приложения
let favoritesInterval;

async function start() {
  try {
    console.log('🚀 Запуск KETMAR Market...\n');
    
    // 1. Подключение к MongoDB
    console.log('📊 Подключение к MongoDB...');
    await connectDB();
    
    // 2. Запуск Express API сервера
    console.log(`\n🌐 Запуск API сервера на порту ${PORT}...`);
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ API сервер запущен: http://localhost:${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   Доступен по адресу: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    });
    
    // 3. Запуск Telegram бота
    console.log('\n🤖 Запуск Telegram бота...');
    await bot.launch();
    console.log('✅ Telegram бот запущен и готов к работе!');

    const runFavoritesCheck = () => {
      checkFavoritesForChanges().catch((error) =>
        console.error('favoritesNotifier runtime error:', error)
      );
    };

    runFavoritesCheck();
    favoritesInterval = setInterval(runFavoritesCheck, 2 * 60 * 1000);
    
    console.log('\n✨ Все сервисы успешно запущены!\n');
    console.log('📋 Доступные команды бота:');
    console.log('   /start - Приветствие');
    console.log('   /myid - Узнать свой Telegram ID');
    console.log('   /categories - Список категорий');
    console.log('   /new_test_ad - Создать тестовое объявление\n');
    
    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n⚠️  Получен сигнал ${signal}. Завершение работы...`);
      
      if (favoritesInterval) {
        clearInterval(favoritesInterval);
        favoritesInterval = null;
      }

      bot.stop(signal);
      console.log('✅ Telegram бот остановлен');
      
      server.close(() => {
        console.log('✅ API сервер остановлен');
        process.exit(0);
      });
    };
    
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    
  } catch (error) {
    console.error('❌ Критическая ошибка при запуске:', error);
    process.exit(1);
  }
}

// Обработка необработанных ошибок
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Запуск приложения
start();
