import dotenv from 'dotenv';
import connectDB from './services/db.js';
import app from './api/server.js';
import bot from './bot/bot.js';

// Загрузка переменных окружения
dotenv.config();

const PORT = process.env.PORT || 3000;

// Главная функция запуска приложения
async function start() {
  try {
    console.log('🚀 Запуск Telegram Marketplace...\n');
    
    // 1. Подключение к MongoDB
    console.log('📊 Подключение к MongoDB...');
    await connectDB();
    
    // 2. Запуск Express API сервера
    console.log(`\n🌐 Запуск API сервера на порту ${PORT}...`);
    const server = app.listen(PORT, () => {
      console.log(`✅ API сервер запущен: http://localhost:${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
    });
    
    // 3. Запуск Telegram бота
    console.log('\n🤖 Запуск Telegram бота...');
    bot.launch().then(() => {
      console.log('✅ Telegram бот запущен и готов к работе!');
      
      console.log('\n✨ Все сервисы успешно запущены!\n');
      console.log('📋 Доступные команды бота:');
      console.log('   /start - Приветствие');
      console.log('   /catalog - Каталог товаров');
      console.log('   /categories - Список категорий');
      console.log('   /search - Поиск товаров');
      console.log('   /myorders - Мои заказы');
      console.log('   /myid - Узнать свой Telegram ID\n');
    }).catch(err => {
      console.error('❌ Ошибка запуска бота:', err);
      process.exit(1);
    });
    
    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n⚠️  Получен сигнал ${signal}. Завершение работы...`);
      
      bot.stop(signal);
      console.log('✅ Telegram бот остановлен');
      
      server.close(() => {
        console.log('✅ API сервер остановлен');
      });
      
      process.exit(0);
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
