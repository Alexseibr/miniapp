const config = require('./config/config.js');
const connectDB = require('./services/db.js');
const app = require('./api/server.js');
const bot = require('./bot/bot.js');
const { checkFavoritesForChanges } = require('./notifications/watcher');
const path = require('path');
const fs = require('fs');

const PORT = config.port;

// Главная функция запуска приложения
let favoritesInterval;

async function start() {
  try {
    console.log('🚀 Запуск KETMAR Market...\n');
    
    // 1. Подключение к MongoDB
    console.log('📊 Подключение к MongoDB...');
    await connectDB();
    
    // 2. Настройка Vite dev server для фронтенда (только в dev mode)
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n🎨 Настройка Vite dev server...');
      const { createServer: createViteServer } = await import('vite');
      const react = await import('@vitejs/plugin-react');
      
      const vite = await createViteServer({
        configFile: false,
        plugins: [react.default()],
        server: { 
          middlewareMode: true,
          hmr: {
            host: process.env.REPLIT_DEV_DOMAIN || 'localhost',
          },
        },
        appType: 'custom',
        root: path.resolve(__dirname, 'client'),
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'client/src'),
            '@shared': path.resolve(__dirname, 'shared'),
            '@assets': path.resolve(__dirname, 'attached_assets'),
          },
        },
      });

      // Vite middleware должен быть ПОСЛЕ API routes
      app.use(vite.middlewares);
      
      // Раздача index.html для всех non-API routes
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        
        // Пропускаем API endpoints
        if (url.startsWith('/api') || url.startsWith('/health') || url.startsWith('/auth')) {
          return next();
        }
        
        try {
          const template = await fs.promises.readFile(
            path.resolve(__dirname, 'client/index.html'),
            'utf-8'
          );
          const html = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } catch (e) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
      
      console.log('✅ Vite dev server настроен');
    }
    
    // Error handlers должны быть в самом конце, после всех middleware
    const { logErrors, notFoundHandler, errorHandler } = require('./api/middleware/errorHandlers.js');
    app.use(notFoundHandler);
    app.use(logErrors);
    app.use(errorHandler);
    
    // 3. Запуск Express API сервера
    console.log(`\n🌐 Запуск API сервера на порту ${PORT}...`);
    const server = app.listen(PORT, '0.0.0.0', () => {
      const publicUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `http://localhost:${PORT}`;
      
      console.log(`✅ API сервер запущен: http://localhost:${PORT}`);
      console.log(`   Health check: ${publicUrl}/health`);
      console.log(`   Frontend: ${publicUrl}/`);
      console.log(`\n🌐 Доступен по адресу: ${publicUrl}`);
    });
    
    // 3. Запуск Telegram бота
    console.log('\n🤖 Запуск Telegram бота...');
    await bot.launch();
    app.set('bot', bot);
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
