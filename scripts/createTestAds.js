import Ad from '../models/Ad.js';
import Category from '../models/Category.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// City coordinates for Belarus
const cities = [
  { code: 'minsk', name: 'Минск', lat: 53.9006, lng: 27.5590 },
  { code: 'brest', name: 'Брест', lat: 52.0977, lng: 23.7340 },
  { code: 'grodno', name: 'Гродно', lat: 53.6693, lng: 23.8131 },
  { code: 'gomel', name: 'Гомель', lat: 52.4411, lng: 30.9878 },
  { code: 'vitebsk', name: 'Витебск', lat: 55.1904, lng: 30.2049 },
  { code: 'mogilev', name: 'Могилёв', lat: 53.9007, lng: 30.3313 },
];

// Test telegram ID for seller
const TEST_SELLER_ID = 123456789;

// Random helper functions
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomPrice(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDaysAgo(maxDays) {
  const days = Math.floor(Math.random() * maxDays);
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Test ads data by category
const testAdsData = {
  'noutbuki-kompyutery': [
    {
      title: 'MacBook Pro 14" M3 Pro 18GB/512GB, новый',
      description: 'Новый MacBook Pro 14 дюймов с чипом M3 Pro. Конфигурация: 18GB оперативной памяти, 512GB SSD. Цвет Space Black. Куплен в официальном магазине, есть чек и гарантия. Комплект полный: зарядка, документы, коробка. Идеальное состояние, без царапин и потёртостей. Подходит для профессиональной работы с видео, фото, программирования.',
      price: 3200,
    },
    {
      title: 'Lenovo ThinkPad X1 Carbon Gen 11, i7/16GB',
      description: 'Ультрабук Lenovo ThinkPad X1 Carbon 11 поколения. Процессор Intel Core i7-1355U, 16GB RAM, 512GB NVMe SSD. Экран 14" WUXGA (1920x1200) IPS, антибликовый. Клавиатура с подсветкой, сканер отпечатков пальцев. Вес всего 1.12 кг. Состояние отличное, использовался для работы в офисе. Батарея держит до 10 часов. Полный комплект с зарядным устройством.',
      price: 1800,
    },
    {
      title: 'ASUS ROG Strix G15, RTX 4060 8GB, 144Hz',
      description: 'Игровой ноутбук ASUS ROG Strix G15. AMD Ryzen 7 7735HS, 16GB DDR5 RAM, NVIDIA GeForce RTX 4060 8GB. Экран 15.6" Full HD 144Hz. SSD 512GB. RGB подсветка клавиатуры. Отличная система охлаждения. Тянет все современные игры на высоких настройках. Куплен 3 месяца назад, есть гарантия. Состояние как новый.',
      price: 2400,
    },
  ],
  'telefony-planshety': [
    {
      title: 'iPhone 15 Pro Max 256GB Титан, как новый',
      description: 'iPhone 15 Pro Max 256GB, цвет Natural Titanium. Состояние идеальное, использовался 2 месяца. Полный комплект: коробка, кабель, документы. Батарея 100%. Защитное стекло и чехол в подарок. Куплен в iSpace, есть чек, гарантия до ноября 2025. Без царапин, сколов, работает безупречно.',
      price: 2800,
    },
    {
      title: 'Samsung Galaxy S24 Ultra 12/512GB, новый',
      description: 'Новый Samsung Galaxy S24 Ultra. Память 12GB/512GB, цвет Titanium Gray. В заводской плёнке, не активирован. Покупался как подарок, не подошёл. Полный комплект, гарантия производителя 2 года. Флагманская камера 200MP, S Pen в комплекте, процессор Snapdragon 8 Gen 3.',
      price: 2200,
    },
    {
      title: 'Xiaomi 13T Pro 12/512GB, чёрный',
      description: 'Xiaomi 13T Pro в топовой конфигурации 12GB/512GB. Цвет Midnight Black. Состояние отличное, куплен 4 месяца назад. Камера Leica с оптической стабилизацией, быстрая зарядка 120W (зарядка в комплекте). Экран 144Hz AMOLED. Чехол и защитное стекло установлены. Никаких дефектов, всё работает идеально.',
      price: 1200,
    },
  ],
  'legkovye-avtomobili': [
    {
      title: 'Volkswagen Passat B8 2.0 TDI DSG, 2019',
      description: 'Volkswagen Passat B8 в топовой комплектации Highline. Дизель 2.0 TDI 150 л.с., коробка DSG-7. Пробег 89 000 км, один владелец. Полная история обслуживания у дилера. Комплектация: кожаный салон, панорамная крыша, адаптивный круиз-контроль, электропривод сидений с памятью, климат-контроль 3-зоны, парковочные ассистенты. Состояние отличное, не требует вложений.',
      price: 28000,
    },
    {
      title: 'Toyota Camry 2.5 Престиж, 2021',
      description: 'Toyota Camry XV70 в максимальной комплектации Престиж. Бензин 2.5 литра 181 л.с., автомат. Пробег 42 000 км. Цвет белый перламутр. Один владелец, обслуживание у дилера Toyota. Комплектация включает: JBL аудиосистему, панорамную крышу, камеру 360, адаптивный круиз, вентиляцию сидений, электропривод багажника. Состояние идеальное.',
      price: 45000,
    },
    {
      title: 'BMW X5 F15 xDrive30d M-пакет, 2018',
      description: 'BMW X5 F15 с дизельным двигателем 3.0d 258 л.с., полный привод xDrive, автомат 8-ступ. Пробег 125 000 км. Комплектация M Sport: спортивный обвес, 20" диски M, спортивные сиденья, руль M. Опции: панорама, камера заднего вида, парктроники, кожаный салон, мультимедиа Professional. Техническое состояние отличное, свежее ТО.',
      price: 52000,
    },
  ],
  'mebel': [
    {
      title: 'Диван угловой Монреаль, серый велюр, 3м',
      description: 'Современный угловой диван Монреаль. Обивка: велюр серого цвета (легко чистится). Размеры: 300см x 200см. Механизм трансформации еврокнижка, спальное место 200x150см. Наполнитель: пружинный блок + ППУ высокой плотности. Есть бельевой ящик. Состояние отличное, использовался 1 год. Без пятен, затяжек, запахов. Самовывоз.',
      price: 850,
    },
    {
      title: 'Кровать двуспальная с матрасом 160x200',
      description: 'Двуспальная кровать с ортопедическим основанием. Размер 160x200см. Каркас из массива сосны, цвет венге. В комплекте ортопедический матрас средней жёсткости на независимых пружинах. Состояние хорошее, матрасу 1.5 года. Устойчивая конструкция, без скрипа. Подходит для спальни в современном стиле.',
      price: 420,
    },
    {
      title: 'Шкаф-купе 2-дверный, венге/зеркало, 180см',
      description: 'Шкаф-купе 2-створчатый. Размеры: высота 240см, ширина 180см, глубина 60см. Корпус ЛДСП цвет венге. Двери: одна зеркальная, одна ЛДСП. Внутри: полки, штанга для вешалок, выдвижные ящики. Раздвижная система на подшипниках, работает бесшумно. Состояние очень хорошее. Разборка и доставка за отдельную плату.',
      price: 550,
    },
  ],
  'igrushki': [
    {
      title: 'LEGO Technic Bugatti Chiron 42083, новый',
      description: 'Конструктор LEGO Technic Bugatti Chiron 42083. Новый, запечатанный. 3599 деталей. Модель с функциональной коробкой передач, работающим двигателем W16 с движущимися поршнями. Открывающиеся двери, багажник. Подробная инструкция в комплекте. Отличный подарок для детей от 16 лет и взрослых коллекционеров.',
      price: 450,
    },
    {
      title: 'Интерактивная кукла Baby Born, полный набор',
      description: 'Кукла Baby Born Zapf Creation с аксессуарами. Полный комплект: бутылочка, соска, одежда (3 комплекта), горшок, подгузники. Кукла умеет пить, кушать, плакать, ходить на горшок. Высота 43см. Состояние отличное, играли аккуратно. Все функции работают. Подходит для детей от 3 лет.',
      price: 65,
    },
    {
      title: 'Железная дорога Brio Deluxe World, дерево',
      description: 'Деревянная железная дорога Brio World Deluxe Set. В наборе: локомотив на батарейках, 3 вагона, рельсы (более 20 элементов), мост, туннель, деревья, фигурки. Совместима с другими наборами Brio и IKEA. Экологичное дерево, безопасные краски. Состояние хорошее, все детали на месте. Развивает моторику и воображение.',
      price: 120,
    },
  ],
  'kolyaski-avtokresla': [
    {
      title: 'Коляска Cybex Priam 3в1, Rose Gold, 2023',
      description: 'Премиальная коляска Cybex Priam в комплектации 3в1. Цвет рамы Rose Gold. Год выпуска 2023. В комплекте: люлька для новорождённых, прогулочный блок, автокресло Cloud Z i-Size. Амортизация на всех колёсах, реверсивная ручка, большая корзина. Состояние отличное, использовалась 8 месяцев. Все ткани стираны, без пятен.',
      price: 1800,
    },
    {
      title: 'Автокресло Recaro Monza Nova Evo, 9-36кг',
      description: 'Автокресло Recaro Monza Nova Evo Seatfix для детей 9-36 кг (группы 1/2/3). Крепление Isofix + якорный ремень. Регулируемая спинка и подголовник. Боковая защита от ударов. Обивка снимается для стирки. Сертифицировано по ECE R44/04. Использовалось одним ребёнком 2 года. Чистое, без ДТП.',
      price: 180,
    },
    {
      title: 'Прогулочная коляска Yoyo+ 6м+, чёрная рама',
      description: 'Коляска Babyzen Yoyo+ для детей от 6 месяцев. Компактная, складывается одной рукой. Подходит как ручная кладь в самолёт. Вес 6.2 кг. Комплектация: дождевик, москитная сетка, сумка для мамы, подстаканник. Колёса на подшипниках. Регулируемая спинка. Состояние хорошее, пару потёртостей на раме.',
      price: 520,
    },
  ],
  'sobaki': [
    {
      title: 'Щенки лабрадора-ретривера, палевые, РКФ',
      description: 'Продаются щенки лабрадора-ретривера палевого окраса. Дата рождения 15.10.2024. Документы РКФ (Российская Кинологическая Федерация), клеймо, ветпаспорт. Привиты по возрасту, обработаны от паразитов. Родители с отличными родословными, дипломы с выставок. Щенки социализированы, приучены к пелёнке. Готовы к переезду. Помощь в выращивании.',
      price: 600,
    },
    {
      title: 'Немецкая овчарка, кобель, 2 года, для охраны',
      description: 'Немецкая овчарка, кобель, возраст 2 года. Окрас чепрачный. Крупный, 40 кг. Здоров, привит, чипирован. Прошёл курс дрессировки ОКД. Отлично подходит для охраны частного дома или территории. Слушается команд, не агрессивен к людям. Адекватный, не пугливый. Отдаём в связи с переездом в квартиру.',
      price: 300,
    },
    {
      title: 'Джек-рассел терьер, девочка, мини, 1 год',
      description: 'Джек-рассел терьер, сука, возраст 1 год. Окрас триколор. Размер мини (вес 5 кг). Документы РКФ, родословная. Привита, чипирована, стерилизована. Очень активная, игривая, ласковая. Приучена к пелёнке и улице. Знает команды: сидеть, лежать, дай лапу. Подходит для квартиры. Отдаём только в ответственные руки.',
      price: 450,
    },
  ],
  'koshki': [
    {
      title: 'Британский котёнок, мальчик, голубой, 3 мес',
      description: 'Британский короткошёрстный котёнок, кот, окрас голубой (серый). Возраст 3 месяца. Документы WCF, родословная. Привит, есть ветпаспорт. Приучен к лотку, когтеточке. Кушает сухой корм премиум-класса. Родители чемпионы, фото в объявлении. Котёнок ласковый, спокойный, игривый. Плюшевая шерсть, круглая мордочка.',
      price: 250,
    },
    {
      title: 'Мейн-кун, кошечка, красный окрас, 5 мес',
      description: 'Котёнок породы мейн-кун, девочка, окрас красный мраморный. Возраст 5 месяцев. Крупная, уже 3.5 кг. Документы, родословная. Привита комплексной вакциной, обработана от паразитов. Приучена к лотку, когтеточке. Характер ласковый, общительный, любит играть. Шерсть густая, кисточки на ушах. Родители крупные, здоровые.',
      price: 550,
    },
    {
      title: 'Шотландский вислоухий кот, 1.5 года, серебро',
      description: 'Шотландская вислоухая кошка (скоттиш-фолд), возраст 1.5 года. Окрас серебристая шиншилла. Кастрирован. Привит, здоров. Приучен к лотку, аккуратный. Спокойный характер, не царапается, ласковый. Хорошо ладит с детьми. Отдаём из-за аллергии у ребёнка. С удовольствием живёт в квартире.',
      price: 100,
    },
  ],
};

async function createTestAds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all leaf categories with icons
    const leafCategories = await Category.find({ 
      isLeaf: true, 
      icon3d: { $ne: null } 
    }).select('slug name icon3d');
    
    console.log(`\nFound ${leafCategories.length} leaf categories with 3D icons\n`);
    
    let totalCreated = 0;
    const createdAds = [];
    
    for (const category of leafCategories) {
      console.log(`\nProcessing category: ${category.name} (${category.slug})`);
      
      const adsData = testAdsData[category.slug] || [];
      
      if (adsData.length === 0) {
        console.log(`  ⚠ No test data defined for ${category.slug}, skipping...`);
        continue;
      }
      
      for (let i = 0; i < adsData.length; i++) {
        const adData = adsData[i];
        const city = randomElement(cities);
        
        const ad = {
          title: adData.title,
          description: adData.description,
          categoryId: category.slug,
          subcategoryId: category.slug,
          price: adData.price,
          currency: 'BYN',
          sellerTelegramId: TEST_SELLER_ID,
          city: city.name,
          cityCode: city.code,
          location: {
            lat: city.lat + (Math.random() - 0.5) * 0.1, // Add some randomness
            lng: city.lng + (Math.random() - 0.5) * 0.1,
          },
          status: 'active',
          moderationStatus: 'approved',
          photos: [],
          createdAt: randomDaysAgo(30),
        };
        
        const created = await Ad.create(ad);
        console.log(`  ✓ Created: ${ad.title} (${ad.price} ${ad.currency})`);
        totalCreated++;
        
        createdAds.push({
          id: created._id,
          title: created.title,
          categorySlug: category.slug,
          price: created.price,
          city: city.name,
        });
      }
    }
    
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Total ads created: ${totalCreated}`);
    console.log(`Categories with ads: ${Object.keys(testAdsData).length}`);
    
    await mongoose.disconnect();
    console.log('\n✓ Database disconnected');
    console.log('✓ Test ads creation complete!');
    
  } catch (error) {
    console.error('Error creating test ads:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createTestAds();
