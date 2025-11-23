const mongoose = require('mongoose');
require('dotenv').config();

const categorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    parentSlug: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model('Category', categorySchema);

const kufarCategories = [
  // Недвижимость
  { slug: 'nedvizhimost', name: 'Недвижимость', icon: 'Home', description: 'Квартиры, дома, участки', parentSlug: null, sortOrder: 1 },
  { slug: 'kvartiry', name: 'Квартиры', parentSlug: 'nedvizhimost', sortOrder: 1 },
  { slug: 'komnaty', name: 'Комнаты', parentSlug: 'nedvizhimost', sortOrder: 2 },
  { slug: 'doma-dachi-kottedzhi', name: 'Дома, дачи, коттеджи', parentSlug: 'nedvizhimost', sortOrder: 3 },
  { slug: 'uchastki', name: 'Участки', parentSlug: 'nedvizhimost', sortOrder: 4 },
  { slug: 'garazhi-mashinomesta', name: 'Гаражи и машиноместа', parentSlug: 'nedvizhimost', sortOrder: 5 },
  { slug: 'kommercheskaya-nedvizhimost', name: 'Коммерческая недвижимость', parentSlug: 'nedvizhimost', sortOrder: 6 },
  { slug: 'nedvizhimost-za-rubezhom', name: 'Недвижимость за рубежом', parentSlug: 'nedvizhimost', sortOrder: 7 },

  // Услуги
  { slug: 'uslugi', name: 'Услуги', icon: 'Wrench', description: 'Профессиональные услуги', parentSlug: null, sortOrder: 2 },
  { slug: 'stroitelstvo-remont', name: 'Строительство и ремонт', parentSlug: 'uslugi', sortOrder: 1 },
  { slug: 'uslugi-po-domu', name: 'Услуги по дому', parentSlug: 'uslugi', sortOrder: 2 },
  { slug: 'transportnye-uslugi', name: 'Транспортные услуги', parentSlug: 'uslugi', sortOrder: 3 },
  { slug: 'biznes-uslugi', name: 'Бизнес услуги', parentSlug: 'uslugi', sortOrder: 4 },
  { slug: 'krasota-zdorove', name: 'Красота и здоровье', parentSlug: 'uslugi', sortOrder: 5 },
  { slug: 'obuchenie-kursy', name: 'Обучение и курсы', parentSlug: 'uslugi', sortOrder: 6 },
  { slug: 'prazdniki-meropriyatiya', name: 'Праздники и мероприятия', parentSlug: 'uslugi', sortOrder: 7 },
  { slug: 'foto-video-uslugi', name: 'Фото и видео услуги', parentSlug: 'uslugi', sortOrder: 8 },
  { slug: 'uslugi-nyani-sidelki', name: 'Услуги няни и сиделки', parentSlug: 'uslugi', sortOrder: 9 },

  // Путешествия
  { slug: 'puteshestviya', name: 'Путешествия', icon: 'Plane', description: 'Туры и билеты', parentSlug: null, sortOrder: 3 },
  { slug: 'tury', name: 'Туры', parentSlug: 'puteshestviya', sortOrder: 1 },
  { slug: 'aviabilety', name: 'Авиабилеты', parentSlug: 'puteshestviya', sortOrder: 2 },
  { slug: 'zhd-bilety', name: 'Ж/д билеты', parentSlug: 'puteshestviya', sortOrder: 3 },
  { slug: 'avtobusnye-bilety', name: 'Автобусные билеты', parentSlug: 'puteshestviya', sortOrder: 4 },
  { slug: 'gostinitsy-oteli', name: 'Гостиницы и отели', parentSlug: 'puteshestviya', sortOrder: 5 },

  // Ремонт и стройка
  { slug: 'remont-stroyka', name: 'Ремонт и стройка', icon: 'Hammer', description: 'Материалы и инструменты', parentSlug: null, sortOrder: 4 },
  { slug: 'stroitelnye-materialy', name: 'Строительные материалы', parentSlug: 'remont-stroyka', sortOrder: 1 },
  { slug: 'otdelochnye-materialy', name: 'Отделочные материалы', parentSlug: 'remont-stroyka', sortOrder: 2 },
  { slug: 'santehnika', name: 'Сантехника', parentSlug: 'remont-stroyka', sortOrder: 3 },
  { slug: 'dveri-okna', name: 'Двери и окна', parentSlug: 'remont-stroyka', sortOrder: 4 },
  { slug: 'instrument', name: 'Инструмент', parentSlug: 'remont-stroyka', sortOrder: 5 },
  { slug: 'elektroinstrument', name: 'Электроинструмент', parentSlug: 'remont-stroyka', sortOrder: 6 },

  // Авто и запчасти
  { slug: 'avto-zapchasti', name: 'Авто и запчасти', icon: 'Car', description: 'Автомобили и комплектующие', parentSlug: null, sortOrder: 5 },
  { slug: 'legkovye-avtomobili', name: 'Легковые автомобили', parentSlug: 'avto-zapchasti', sortOrder: 1 },
  { slug: 'gruzovye-avtomobili', name: 'Грузовые автомобили', parentSlug: 'avto-zapchasti', sortOrder: 2 },
  { slug: 'mototehnika', name: 'Мототехника', parentSlug: 'avto-zapchasti', sortOrder: 3 },
  { slug: 'spetstekhnika', name: 'Спецтехника', parentSlug: 'avto-zapchasti', sortOrder: 4 },
  { slug: 'zapchasti-aksessuary', name: 'Запчасти и аксессуары', parentSlug: 'avto-zapchasti', sortOrder: 5 },
  { slug: 'shiny-diski', name: 'Шины и диски', parentSlug: 'avto-zapchasti', sortOrder: 6 },
  { slug: 'avtoelektronika', name: 'Автоэлектроника', parentSlug: 'avto-zapchasti', sortOrder: 7 },

  // Хобби, спорт и туризм
  { slug: 'hobbi-sport-turizm', name: 'Хобби, спорт и туризм', icon: 'Dumbbell', description: 'Товары для активного отдыха', parentSlug: null, sortOrder: 6 },
  { slug: 'sport-otdyh', name: 'Спорт и отдых', parentSlug: 'hobbi-sport-turizm', sortOrder: 1 },
  { slug: 'trenazhjery', name: 'Тренажёры', parentSlug: 'hobbi-sport-turizm', sortOrder: 2 },
  { slug: 'velosipedy', name: 'Велосипеды', parentSlug: 'hobbi-sport-turizm', sortOrder: 3 },
  { slug: 'oxota-rybalka', name: 'Охота и рыбалка', parentSlug: 'hobbi-sport-turizm', sortOrder: 4 },
  { slug: 'turizm', name: 'Туризм', parentSlug: 'hobbi-sport-turizm', sortOrder: 5 },
  { slug: 'muzykalnye-instrumenty', name: 'Музыкальные инструменты', parentSlug: 'hobbi-sport-turizm', sortOrder: 6 },
  { slug: 'kollektsionirovanie', name: 'Коллекционирование', parentSlug: 'hobbi-sport-turizm', sortOrder: 7 },

  // Электроника
  { slug: 'elektronika', name: 'Электроника', icon: 'Smartphone', description: 'Гаджеты и техника', parentSlug: null, sortOrder: 7 },
  { slug: 'telefony-planshety', name: 'Телефоны и планшеты', parentSlug: 'elektronika', sortOrder: 1 },
  { slug: 'noutbuki-kompyutery', name: 'Ноутбуки и компьютеры', parentSlug: 'elektronika', sortOrder: 2 },
  { slug: 'tv-foto-video', name: 'ТВ, фото и видео', parentSlug: 'elektronika', sortOrder: 3 },
  { slug: 'audio-tehnika', name: 'Аудиотехника', parentSlug: 'elektronika', sortOrder: 4 },
  { slug: 'igry-igrovye-pristavki', name: 'Игры и игровые приставки', parentSlug: 'elektronika', sortOrder: 5 },
  { slug: 'tovary-dlya-kompyutera', name: 'Товары для компьютера', parentSlug: 'elektronika', sortOrder: 6 },

  // Бытовая техника
  { slug: 'bytovaya-tehnika', name: 'Бытовая техника', icon: 'Microwave', description: 'Техника для дома', parentSlug: null, sortOrder: 8 },
  { slug: 'krupnaya-bytovaya-tehnika', name: 'Крупная бытовая техника', parentSlug: 'bytovaya-tehnika', sortOrder: 1 },
  { slug: 'melkaya-bytovaya-tehnika', name: 'Мелкая бытовая техника', parentSlug: 'bytovaya-tehnika', sortOrder: 2 },
  { slug: 'klimaticheskaya-tehnika', name: 'Климатическая техника', parentSlug: 'bytovaya-tehnika', sortOrder: 3 },
  { slug: 'tehnika-dlya-kuhni', name: 'Техника для кухни', parentSlug: 'bytovaya-tehnika', sortOrder: 4 },

  // Одежда и обувь
  { slug: 'odezhda-obuv', name: 'Одежда и обувь', icon: 'Shirt', description: 'Мужская и женская одежда', parentSlug: null, sortOrder: 9 },
  { slug: 'zhenskaya-odezhda', name: 'Женская одежда', parentSlug: 'odezhda-obuv', sortOrder: 1 },
  { slug: 'muzhskaya-odezhda', name: 'Мужская одежда', parentSlug: 'odezhda-obuv', sortOrder: 2 },
  { slug: 'detskaya-odezhda', name: 'Детская одежда', parentSlug: 'odezhda-obuv', sortOrder: 3 },
  { slug: 'zhenskaya-obuv', name: 'Женская обувь', parentSlug: 'odezhda-obuv', sortOrder: 4 },
  { slug: 'muzhskaya-obuv', name: 'Мужская обувь', parentSlug: 'odezhda-obuv', sortOrder: 5 },
  { slug: 'detskaya-obuv', name: 'Детская обувь', parentSlug: 'odezhda-obuv', sortOrder: 6 },
  { slug: 'aksessuary', name: 'Аксессуары', parentSlug: 'odezhda-obuv', sortOrder: 7 },

  // Дом и сад
  { slug: 'dom-sad', name: 'Дом и сад', icon: 'TreePine', description: 'Мебель и товары для дома', parentSlug: null, sortOrder: 10 },
  { slug: 'mebel', name: 'Мебель', parentSlug: 'dom-sad', sortOrder: 1 },
  { slug: 'posuda-kuhonnye-prinadlezhnosti', name: 'Посуда и кухонные принадлежности', parentSlug: 'dom-sad', sortOrder: 2 },
  { slug: 'produkty-pitaniya', name: 'Продукты питания', parentSlug: 'dom-sad', sortOrder: 3 },
  { slug: 'rasteniya', name: 'Растения', parentSlug: 'dom-sad', sortOrder: 4 },
  { slug: 'tovary-dlya-sada', name: 'Товары для сада', parentSlug: 'dom-sad', sortOrder: 5 },
  { slug: 'dekor-tekstil', name: 'Декор и текстиль', parentSlug: 'dom-sad', sortOrder: 6 },

  // Товары для детей
  { slug: 'tovary-dlya-detey', name: 'Товары для детей', icon: 'Baby', description: 'Всё для детей', parentSlug: null, sortOrder: 11 },
  { slug: 'detskaya-mebel', name: 'Детская мебель', parentSlug: 'tovary-dlya-detey', sortOrder: 1 },
  { slug: 'kolyaski-avtokresla', name: 'Коляски и автокресла', parentSlug: 'tovary-dlya-detey', sortOrder: 2 },
  { slug: 'detskoe-pitanie', name: 'Детское питание', parentSlug: 'tovary-dlya-detey', sortOrder: 3 },
  { slug: 'igrushki', name: 'Игрушки', parentSlug: 'tovary-dlya-detey', sortOrder: 4 },
  { slug: 'tovary-dlya-novorozhdjonnykh', name: 'Товары для новорождённых', parentSlug: 'tovary-dlya-detey', sortOrder: 5 },

  // Животные
  { slug: 'zhivotnye', name: 'Животные', icon: 'PawPrint', description: 'Питомцы и товары для животных', parentSlug: null, sortOrder: 12 },
  { slug: 'sobaki', name: 'Собаки', parentSlug: 'zhivotnye', sortOrder: 1 },
  { slug: 'koshki', name: 'Кошки', parentSlug: 'zhivotnye', sortOrder: 2 },
  { slug: 'ptitsy', name: 'Птицы', parentSlug: 'zhivotnye', sortOrder: 3 },
  { slug: 'akvarium-rybki', name: 'Аквариум и рыбки', parentSlug: 'zhivotnye', sortOrder: 4 },
  { slug: 'drugie-zhivotnye', name: 'Другие животные', parentSlug: 'zhivotnye', sortOrder: 5 },
  { slug: 'tovary-dlya-zhivotnykh', name: 'Товары для животных', parentSlug: 'zhivotnye', sortOrder: 6 },

  // Красота и здоровье
  { slug: 'krasota-zdorove-tovary', name: 'Красота и здоровье', icon: 'Sparkles', description: 'Косметика и здоровье', parentSlug: null, sortOrder: 13 },
  { slug: 'kosmetika-parfyumeriya', name: 'Косметика и парфюмерия', parentSlug: 'krasota-zdorove-tovary', sortOrder: 1 },
  { slug: 'ukhod-za-telom-volosami', name: 'Уход за телом и волосами', parentSlug: 'krasota-zdorove-tovary', sortOrder: 2 },
  { slug: 'medtekhnika-optika', name: 'Медтехника и оптика', parentSlug: 'krasota-zdorove-tovary', sortOrder: 3 },

  // Работа
  { slug: 'rabota', name: 'Работа', icon: 'Briefcase', description: 'Вакансии и резюме', parentSlug: null, sortOrder: 14 },
  { slug: 'vakansii', name: 'Вакансии', parentSlug: 'rabota', sortOrder: 1 },
  { slug: 'rezyume', name: 'Резюме', parentSlug: 'rabota', sortOrder: 2 },
];

async function seedCategories() {
  try {
    const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URL;
    if (!mongoUrl) {
      throw new Error('MONGODB_URI или MONGO_URL не найдены в переменных окружения');
    }

    console.log('🔌 Подключение к MongoDB...');
    await mongoose.connect(mongoUrl);
    console.log('✅ Подключено к MongoDB');

    console.log('🗑️  Удаление существующих категорий...');
    await Category.deleteMany({});
    console.log('✅ Категории удалены');

    console.log('📦 Создание новых категорий в стиле Kufar.by...');
    await Category.insertMany(kufarCategories);
    console.log(`✅ Создано ${kufarCategories.length} категорий`);

    // Проверка
    const count = await Category.countDocuments();
    console.log(`📊 Всего категорий в базе: ${count}`);

    const topLevel = await Category.find({ parentSlug: null }).sort('sortOrder');
    console.log('\n📋 Основные категории:');
    topLevel.forEach((cat) => {
      console.log(`   ${cat.icon || '📦'} ${cat.name} (${cat.slug})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

seedCategories();
