import dotenv from 'dotenv';
import connectDB from '../services/db.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

dotenv.config();

async function seed() {
  try {
    console.log('🌱 Начинаем заполнение базы данных...\n');
    
    await connectDB();
    
    // Очистка существующих данных
    console.log('🗑️  Очистка старых данных...');
    await Category.deleteMany({});
    await Product.deleteMany({});
    console.log('✅ Старые данные удалены\n');
    
    // Создание категорий
    console.log('📂 Создание категорий...');
    const categories = await Category.insertMany([
      {
        name: 'Электроника',
        description: 'Смартфоны, ноутбуки, планшеты',
        icon: '📱',
      },
      {
        name: 'Одежда',
        description: 'Мужская и женская одежда',
        icon: '👕',
      },
      {
        name: 'Дом и сад',
        description: 'Товары для дома и сада',
        icon: '🏠',
      },
      {
        name: 'Спорт',
        description: 'Спортивные товары и инвентарь',
        icon: '⚽',
      },
      {
        name: 'Книги',
        description: 'Книги всех жанров',
        icon: '📚',
      },
    ]);
    console.log(`✅ Создано ${categories.length} категорий\n`);
    
    // Создание товаров
    console.log('📦 Создание товаров...');
    const products = [
      {
        name: 'iPhone 14 Pro',
        description: 'Смартфон Apple iPhone 14 Pro 256GB, Deep Purple',
        price: 89990,
        categoryId: categories[0]._id,
        stock: 10,
        status: 'active',
        images: ['https://images.unsplash.com/photo-1678652197365-79d57cfc9322?w=500'],
      },
      {
        name: 'MacBook Pro 14',
        description: 'Ноутбук Apple MacBook Pro 14 M2 Pro 512GB',
        price: 179990,
        categoryId: categories[0]._id,
        stock: 5,
        status: 'active',
        images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'],
      },
      {
        name: 'Куртка зимняя',
        description: 'Теплая зимняя куртка с капюшоном',
        price: 8990,
        categoryId: categories[1]._id,
        stock: 20,
        status: 'active',
        images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
      },
      {
        name: 'Кроссовки Nike',
        description: 'Спортивные кроссовки Nike Air Max',
        price: 12990,
        categoryId: categories[3]._id,
        stock: 15,
        status: 'active',
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'],
      },
      {
        name: 'Настольная лампа',
        description: 'Современная LED лампа для рабочего стола',
        price: 2990,
        categoryId: categories[2]._id,
        stock: 30,
        status: 'active',
        images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500'],
      },
      {
        name: 'Книга "1984"',
        description: 'Джордж Оруэлл - классика мировой литературы',
        price: 590,
        categoryId: categories[4]._id,
        stock: 50,
        status: 'active',
        images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500'],
      },
    ];
    
    await Product.insertMany(products);
    console.log(`✅ Создано ${products.length} товаров\n`);
    
    console.log('✨ База данных успешно заполнена!\n');
    console.log('📊 Итого:');
    console.log(`   Категорий: ${categories.length}`);
    console.log(`   Товаров: ${products.length}\n`);
    
    await mongoose.connection.close();
    console.log('👋 Подключение к базе данных закрыто');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при заполнении базы данных:', error);
    process.exit(1);
  }
}

seed();
