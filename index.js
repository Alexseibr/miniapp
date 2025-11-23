const express = require('express');
const config = require('./config/config.js');
const connectDB = require('./services/db.js');
const app = require('./api/server.js');
const { bot } = require('./telegram/bot');
const { checkFavoritesForChanges } = require('./notifications/watcher');
const { startNotificationWorker } = require('./workers/notificationWorker');
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
    
    // 1.5 Регистрация Telegram webhook ПЕРЕД Vite (чтобы не перехватывался)
    const webhookPath = '/telegram-webhook';
    
    // Используем bot.webhookCallback() БЕЗ параметра path
    app.use(webhookPath, (req, res, next) => {
      console.log(`📨 Получен webhook запрос: ${req.method} ${req.url}`);
      return bot.webhookCallback()(req, res, next);
    });
    
    console.log(`✅ Telegram webhook endpoint зарегистрирован: ${webhookPath}`);
    
    // 2. Настройка Vite dev server для фронтенда (только в dev mode)
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n🎨 Настройка Vite dev server...');
      const { createServer: createViteServer } = await import('vite');
      const react = await import('@vitejs/plugin-react');
      
      // Create separate Vite instances for client and miniapp
      const clientVite = await createViteServer({
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

      const miniappVite = await createViteServer({
        configFile: false,
        plugins: [react.default()],
        server: { 
          middlewareMode: true,
          hmr: {
            host: process.env.REPLIT_DEV_DOMAIN || 'localhost',
          },
        },
        appType: 'custom',
        base: '/miniapp/',
        root: path.resolve(__dirname, 'miniapp'),
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'miniapp/src'),
            '@shared': path.resolve(__dirname, 'shared'),
            '@assets': path.resolve(__dirname, 'attached_assets'),
          },
        },
      });
      
      // MiniApp route handler BEFORE client Vite middleware
      app.use('/miniapp*', async (req, res, next) => {
        const url = req.originalUrl;
        console.log(`📱 MiniApp handler: ${url}`);
        
        try {
          const template = await fs.promises.readFile(
            path.resolve(__dirname, 'miniapp/index.html'),
            'utf-8'
          );
          console.log('📱 MiniApp: transforming HTML...');
          const html = await miniappVite.transformIndexHtml(url, template);
          console.log('📱 MiniApp: sending response');
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } catch (e) {
          console.error('📱 MiniApp error:', e);
          miniappVite.ssrFixStacktrace(e);
          next(e);
        }
      });
      
      // Handle MiniApp assets with miniappVite
      app.use('/miniapp', miniappVite.middlewares);

      // Client Vite middleware should be AFTER API routes
      app.use(clientVite.middlewares);
      
      // Раздача index.html для всех non-API routes (client app)
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        
        // Пропускаем API endpoints, webhook, и miniapp
        if (url.startsWith('/api') || url.startsWith('/health') || url.startsWith('/auth') || url.startsWith('/telegram-webhook') || url.startsWith('/miniapp')) {
          return next();
        }
        
        try {
          const template = await fs.promises.readFile(
            path.resolve(__dirname, 'client/index.html'),
            'utf-8'
          );
          const html = await clientVite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } catch (e) {
          clientVite.ssrFixStacktrace(e);
          next(e);
        }
      });
      
      console.log('✅ Vite dev server настроен');
    } else {
      // Production mode: serve static built assets
      console.log('\n📦 Production mode: serving static assets...');
      
      // Serve MiniApp static assets from miniapp/dist
      const miniappDistPath = path.resolve(__dirname, 'miniapp/dist');
      if (fs.existsSync(miniappDistPath)) {
        // Serve static files first
        app.use('/miniapp', express.static(miniappDistPath));
        
        // SPA fallback ONLY for HTML navigation (not assets/APIs)
        app.get('/miniapp/*', (req, res, next) => {
          // Only serve index.html for HTML requests without file extensions
          const hasFileExtension = path.extname(req.path);
          if (!hasFileExtension && req.accepts('html')) {
            res.sendFile(path.resolve(miniappDistPath, 'index.html'));
          } else {
            next(); // Let 404 handler or other routes handle this
          }
        });
        console.log('✅ MiniApp static assets configured');
      } else {
        console.warn('⚠️  MiniApp dist folder not found, /miniapp will not work');
      }
      
      // Serve client app static assets from dist/public
      const clientDistPath = path.resolve(__dirname, 'dist/public');
      if (fs.existsSync(clientDistPath)) {
        app.use(express.static(clientDistPath));
        
        // SPA fallback ONLY for HTML navigation (not assets/APIs)
        app.get('*', (req, res, next) => {
          // Skip API routes
          if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/health') || req.path.startsWith('/telegram-webhook')) {
            return next();
          }
          
          // Only serve index.html for HTML requests without file extensions
          const hasFileExtension = path.extname(req.path);
          if (!hasFileExtension && req.accepts('html')) {
            res.sendFile(path.resolve(clientDistPath, 'index.html'));
          } else {
            next(); // Let 404 handler or other routes handle this
          }
        });
        console.log('✅ Client app static assets configured');
      } else {
        console.warn('⚠️  Client dist folder not found');
      }
    }
    
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
    
    // 4. Запуск Telegram бота
    console.log('\n🤖 Запуск Telegram бота...');
    
    // Проверка токена
    if (!config.botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN не установлен! Бот не будет запущен.');
    } else {
      console.log(`   Токен: ${config.botToken.slice(0, 10)}...${config.botToken.slice(-5)}`);
      
      try {
        // Проверяем валидность токена через HTTP запрос
        console.log('   Проверка токена...');
        const axios = require('axios');
        const testResponse = await axios.get(`https://api.telegram.org/bot${config.botToken}/getMe`, {
          timeout: 10000
        });
        
        if (testResponse.data.ok) {
          console.log(`   ✅ Токен валиден! Бот: @${testResponse.data.result.username}`);
          
          // Устанавливаем webhook в Telegram (endpoint уже зарегистрирован выше)
          const webhookDomain = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : 'http://localhost:5000';
          
          const webhookUrl = `${webhookDomain}${webhookPath}`;
          
          console.log(`   Установка webhook в Telegram: ${webhookUrl}`);
          
          try {
            await axios.post(`https://api.telegram.org/bot${config.botToken}/setWebhook`, {
              url: webhookUrl,
              drop_pending_updates: true,
              allowed_updates: ['message', 'callback_query']
            }, { timeout: 5000 });
            
            console.log('   ✅ Webhook установлен в Telegram');
            
            app.set('bot', bot);
            console.log('✅ Telegram бот запущен (webhook режим)!');
          } catch (webhookError) {
            console.error('❌ Ошибка установки webhook:', webhookError.message);
            if (webhookError.response) {
              console.error('   Ответ:', JSON.stringify(webhookError.response.data));
            }
            console.error('   Бот может не работать.');
          }
        } else {
          throw new Error('Неверный ответ от Telegram API');
        }
      } catch (error) {
        console.error('❌ Ошибка запуска Telegram бота:', error.message);
        if (error.response) {
          console.error('   Ответ Telegram:', error.response.data);
        }
        console.error('   Сервер работает БЕЗ бота. Проверьте TELEGRAM_BOT_TOKEN.');
        // Продолжаем работу без бота
      }
    }

    const runFavoritesCheck = () => {
      checkFavoritesForChanges().catch((error) =>
        console.error('favoritesNotifier runtime error:', error)
      );
    };

    runFavoritesCheck();
    favoritesInterval = setInterval(runFavoritesCheck, 2 * 60 * 1000);

    startNotificationWorker();
    
    // Регистрируем error handlers в самом конце, после всех middleware
    const { logErrors, notFoundHandler, errorHandler } = require('./api/middleware/errorHandlers.js');
    app.use(logErrors);
    app.use(notFoundHandler);
    app.use(errorHandler);
    console.log('✅ Error handlers зарегистрированы');
    
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
