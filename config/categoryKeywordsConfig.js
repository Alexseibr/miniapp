export const CATEGORY_KEYWORD_RULES = [
  // === ЭЛЕКТРОНИКА ===
  
  // Телефоны и планшеты
  {
    categorySlug: 'elektronika',
    subcategorySlug: 'telefony-planshety',
    keywords: [
      'iphone', 'айфон', 'смартфон', 'телефон', 'мобильный', 'мобілка',
      'android', 'андроид', 'samsung', 'xiaomi', 'redmi', 'realme', 
      'huawei', 'honor', 'poco', 'oppo', 'vivo', 'oneplus',
      'планшет', 'ipad', 'айпад', 'tab', 'galaxy tab',
      'pixel', 'motorola', 'nokia', 'sony xperia', 'zte', 'meizu'
    ],
    weight: 4
  },
  // Смартфоны (3-й уровень)
  {
    categorySlug: 'elektronika',
    subcategorySlug: 'smartfony',
    keywords: [
      'iphone', 'айфон', 'смартфон', 'samsung galaxy', 'xiaomi', 'redmi',
      'pro max', 'ultra', 'plus', 'lite', 'mini'
    ],
    weight: 5
  },
  // Планшеты (3-й уровень)
  {
    categorySlug: 'elektronika',
    subcategorySlug: 'planshety',
    keywords: [
      'планшет', 'ipad', 'айпад', 'galaxy tab', 'tab s', 'mediapad'
    ],
    weight: 5
  },
  
  // Ноутбуки и компьютеры
  {
    categorySlug: 'elektronika',
    subcategorySlug: 'noutbuki-kompyutery',
    keywords: [
      'ноутбук', 'laptop', 'macbook', 'макбук', 'ноут',
      'компьютер', 'пк', 'системный блок', 'системник',
      'игровой ноут', 'gaming laptop',
      'asus', 'lenovo', 'hp', 'dell', 'acer', 'msi',
      'imac', 'mac mini', 'mac studio'
    ],
    weight: 4
  },
  
  // ТВ, фото и видео
  {
    categorySlug: 'elektronika',
    subcategorySlug: 'tv-foto-video',
    keywords: [
      'телевизор', 'tv', 'тв', 'smart tv', 'смарт тв',
      'lg', 'samsung tv', 'xiaomi tv', 'sony bravia',
      'oled', 'qled', 'led', 'дюймов', 'дюйма',
      'фотоаппарат', 'камера', 'canon', 'nikon', 'sony alpha',
      'объектив', 'видеокамера', 'экшн камера', 'gopro'
    ],
    weight: 4
  },
  
  // Аудиотехника
  {
    categorySlug: 'elektronika',
    subcategorySlug: 'audio-tehnika',
    keywords: [
      'наушники', 'airpods', 'эйрподс', 'колонка', 'bluetooth колонка',
      'jbl', 'marshall', 'bose', 'sony wh', 'sony wf',
      'усилитель', 'музыкальный центр', 'саундбар', 'soundbar',
      'беспроводные наушники', 'tws', 'аудио'
    ],
    weight: 3
  },
  
  // Игры и игровые приставки
  {
    categorySlug: 'elektronika',
    subcategorySlug: 'igry-igrovye-pristavki',
    keywords: [
      'playstation', 'ps5', 'ps4', 'плейстейшн', 'xbox', 'иксбокс',
      'nintendo', 'switch', 'геймпад', 'джойстик', 'контроллер',
      'игра', 'диск', 'game', 'приставка', 'консоль'
    ],
    weight: 3
  },
  
  // Товары для компьютера
  {
    categorySlug: 'elektronika',
    subcategorySlug: 'tovary-dlya-kompyutera',
    keywords: [
      'монитор', 'клавиатура', 'мышка', 'мышь', 'веб камера',
      'видеокарта', 'процессор', 'оперативная память', 'ssd', 'hdd',
      'материнская плата', 'блок питания', 'кулер', 'вентилятор',
      'nvidia', 'geforce', 'rtx', 'amd', 'ryzen', 'intel'
    ],
    weight: 3
  },

  // === НЕДВИЖИМОСТЬ ===
  
  // Квартиры
  {
    categorySlug: 'nedvizhimost',
    subcategorySlug: 'kvartiry',
    keywords: [
      'квартира', 'квартиру', 'кв.м', 'кв м', 'этаж',
      'комнатная', 'комнатную', 'студия', 'студию',
      'однушка', 'двушка', 'трёшка', 'однокомнатная', 'двухкомнатная', 'трёхкомнатная'
    ],
    weight: 4
  },
  // 1-комнатные
  {
    categorySlug: 'nedvizhimost',
    subcategorySlug: '1-komnatnye',
    keywords: [
      '1к', 'однокомнатная', 'однокомнатную', '1-комнатная', '1 комнатная',
      'однушка', 'однушку', '1-к', '1к квартира'
    ],
    weight: 5
  },
  // 2-комнатные
  {
    categorySlug: 'nedvizhimost',
    subcategorySlug: '2-komnatnye',
    keywords: [
      '2к', 'двухкомнатная', 'двухкомнатную', '2-комнатная', '2 комнатная',
      'двушка', 'двушку', '2-к', '2к квартира'
    ],
    weight: 5
  },
  // 3-комнатные
  {
    categorySlug: 'nedvizhimost',
    subcategorySlug: '3-komnatnye',
    keywords: [
      '3к', 'трёхкомнатная', 'трехкомнатная', '3-комнатная', '3 комнатная',
      'трёшка', 'трешка', '3-к', '3к квартира'
    ],
    weight: 5
  },
  // Студии
  {
    categorySlug: 'nedvizhimost',
    subcategorySlug: 'studii',
    keywords: [
      'студия', 'студию', 'квартира-студия', 'studio'
    ],
    weight: 5
  },
  
  // Комнаты
  {
    categorySlug: 'nedvizhimost',
    subcategorySlug: 'komnaty',
    keywords: [
      'комната', 'комнату', 'койко-место', 'подселение'
    ],
    weight: 4
  },
  
  // Дома, дачи
  {
    categorySlug: 'nedvizhimost',
    subcategorySlug: 'doma-dachi-kottedzhi',
    keywords: [
      'дом', 'дача', 'коттедж', 'таунхаус', 'усадьба',
      'частный дом', 'загородный дом', 'дачный дом'
    ],
    weight: 4
  },
  
  // Участки
  {
    categorySlug: 'nedvizhimost',
    subcategorySlug: 'uchastki',
    keywords: [
      'участок', 'земля', 'земельный участок', 'соток', 'гектар',
      'ижс', 'лпх', 'снт', 'садовый участок'
    ],
    weight: 4
  },
  
  // Гаражи
  {
    categorySlug: 'nedvizhimost',
    subcategorySlug: 'garazhi-mashinomesta',
    keywords: [
      'гараж', 'машиноместо', 'парковка', 'паркинг', 'бокс'
    ],
    weight: 4
  },

  // === АВТО И ЗАПЧАСТИ ===
  
  // Легковые автомобили
  {
    categorySlug: 'avto-zapchasti',
    subcategorySlug: 'legkovye-avtomobili',
    keywords: [
      'автомобиль', 'машина', 'авто', 'легковая', 'легковой',
      'toyota', 'тойота', 'bmw', 'бмв', 'mercedes', 'мерседес',
      'audi', 'ауди', 'volkswagen', 'фольксваген', 'vw',
      'ford', 'форд', 'opel', 'опель', 'renault', 'рено',
      'peugeot', 'пежо', 'citroen', 'ситроен', 'skoda', 'шкода',
      'hyundai', 'хендай', 'kia', 'киа', 'mazda', 'мазда',
      'honda', 'хонда', 'nissan', 'ниссан', 'mitsubishi',
      'geely', 'chery', 'haval', 'lada', 'лада', 'ваз'
    ],
    weight: 4
  },
  
  // Мототехника
  {
    categorySlug: 'avto-zapchasti',
    subcategorySlug: 'mototehnika',
    keywords: [
      'мотоцикл', 'мото', 'байк', 'скутер', 'мопед',
      'квадроцикл', 'atv', 'снегоход', 'yamaha', 'honda',
      'kawasaki', 'suzuki', 'harley', 'ducati'
    ],
    weight: 4
  },
  
  // Запчасти и аксессуары
  {
    categorySlug: 'avto-zapchasti',
    subcategorySlug: 'zapchasti-aksessuary',
    keywords: [
      'запчасть', 'запчасти', 'бампер', 'фара', 'зеркало',
      'двигатель', 'мотор', 'коробка передач', 'кпп', 'акпп',
      'тормоза', 'суппорт', 'амортизатор', 'подвеска'
    ],
    weight: 3
  },
  
  // Шины и диски
  {
    categorySlug: 'avto-zapchasti',
    subcategorySlug: 'shiny-diski',
    keywords: [
      'шины', 'резина', 'покрышки', 'диски', 'колёса', 'колеса',
      'зимняя резина', 'летняя резина', 'всесезонная', 'r15', 'r16', 'r17', 'r18'
    ],
    weight: 3
  },

  // === БЫТОВАЯ ТЕХНИКА ===
  
  // Крупная бытовая
  {
    categorySlug: 'bytovaya-tehnika',
    subcategorySlug: 'krupnaya-bytovaya-tehnika',
    keywords: [
      'холодильник', 'стиральная машина', 'стиралка', 'посудомоечная',
      'плита', 'духовка', 'варочная панель', 'сушильная машина',
      'морозильник', 'морозильная камера'
    ],
    weight: 4
  },
  
  // Мелкая бытовая
  {
    categorySlug: 'bytovaya-tehnika',
    subcategorySlug: 'melkaya-bytovaya-tehnika',
    keywords: [
      'пылесос', 'утюг', 'швейная машина', 'робот пылесос',
      'отпариватель', 'мясорубка', 'блендер'
    ],
    weight: 3
  },
  
  // Климатическая техника
  {
    categorySlug: 'bytovaya-tehnika',
    subcategorySlug: 'klimaticheskaya-tehnika',
    keywords: [
      'кондиционер', 'сплит система', 'вентилятор', 'обогреватель',
      'конвектор', 'тепловентилятор', 'очиститель воздуха', 'увлажнитель'
    ],
    weight: 3
  },
  
  // Техника для кухни
  {
    categorySlug: 'bytovaya-tehnika',
    subcategorySlug: 'tehnika-dlya-kuhni',
    keywords: [
      'микроволновка', 'свч', 'мультиварка', 'чайник', 'электрочайник',
      'кофемашина', 'кофеварка', 'тостер', 'миксер', 'хлебопечка',
      'аэрогриль', 'соковыжималка', 'электрогриль'
    ],
    weight: 3
  },

  // === РЕМОНТ И СТРОЙКА ===
  
  // Двери и окна
  {
    categorySlug: 'remont-stroyka',
    subcategorySlug: 'dveri-okna',
    keywords: [
      'окна', 'евроокна', 'пластиковые окна', 'стеклопакет',
      'двери', 'межкомнатные двери', 'входные двери', 'дверь'
    ],
    weight: 3
  },
  
  // Строительные материалы
  {
    categorySlug: 'remont-stroyka',
    subcategorySlug: 'stroitelnye-materialy',
    keywords: [
      'кирпич', 'блок', 'газобетон', 'пеноблок', 'бетон',
      'цемент', 'песок', 'щебень', 'арматура', 'доска', 'брус'
    ],
    weight: 3
  },
  
  // Инструмент
  {
    categorySlug: 'remont-stroyka',
    subcategorySlug: 'instrument',
    keywords: [
      'инструмент', 'набор инструментов', 'ключи', 'отвёртка'
    ],
    weight: 2
  },
  
  // Электроинструмент
  {
    categorySlug: 'remont-stroyka',
    subcategorySlug: 'elektroinstrument',
    keywords: [
      'дрель', 'перфоратор', 'шуруповёрт', 'шуруповерт', 'болгарка',
      'ушм', 'лобзик', 'циркулярка', 'бензопила', 'электропила',
      'makita', 'bosch', 'dewalt', 'metabo', 'hilti'
    ],
    weight: 3
  },

  // === ОДЕЖДА И ОБУВЬ ===
  
  // Женская одежда
  {
    categorySlug: 'odezhda-obuv',
    subcategorySlug: 'zhenskaya-odezhda',
    keywords: [
      'платье', 'юбка', 'блузка', 'женская куртка', 'женский пуховик',
      'женское пальто', 'женский костюм', 'женские джинсы'
    ],
    weight: 3
  },
  
  // Мужская одежда
  {
    categorySlug: 'odezhda-obuv',
    subcategorySlug: 'muzhskaya-odezhda',
    keywords: [
      'мужская куртка', 'мужской костюм', 'мужские джинсы', 'мужской пиджак',
      'мужское пальто', 'мужская рубашка', 'мужской свитер'
    ],
    weight: 3
  },

  // === ХОББИ, СПОРТ И ТУРИЗМ ===
  
  // Велосипеды
  {
    categorySlug: 'hobbi-sport-turizm',
    subcategorySlug: 'velosipedy',
    keywords: [
      'велосипед', 'велик', 'горный велосипед', 'шоссейный',
      'bmx', 'самокат', 'электросамокат', 'электровелосипед'
    ],
    weight: 3
  },
  
  // Тренажёры
  {
    categorySlug: 'hobbi-sport-turizm',
    subcategorySlug: 'trenazhjery',
    keywords: [
      'тренажёр', 'тренажер', 'беговая дорожка', 'велотренажёр',
      'эллипс', 'штанга', 'гантели', 'гиря', 'скамья'
    ],
    weight: 3
  },

  // === ТОВАРЫ ДЛЯ ДЕТЕЙ ===
  
  // Коляски и автокресла
  {
    categorySlug: 'tovary-dlya-detey',
    subcategorySlug: 'kolyaski-avtokresla',
    keywords: [
      'коляска', 'автокресло', 'детское кресло', 'прогулочная коляска',
      '2 в 1', '3 в 1', 'люлька'
    ],
    weight: 3
  },
  
  // Игрушки
  {
    categorySlug: 'tovary-dlya-detey',
    subcategorySlug: 'igrushki',
    keywords: [
      'игрушка', 'конструктор', 'lego', 'лего', 'кукла',
      'машинка', 'настольная игра', 'пазл'
    ],
    weight: 3
  },

  // === ЖИВОТНЫЕ ===
  
  // Собаки
  {
    categorySlug: 'zhivotnye',
    subcategorySlug: 'sobaki',
    keywords: [
      'щенок', 'собака', 'породистый', 'немецкая овчарка',
      'лабрадор', 'йорк', 'чихуахуа', 'хаски', 'такса'
    ],
    weight: 3
  },
  
  // Кошки
  {
    categorySlug: 'zhivotnye',
    subcategorySlug: 'koshki',
    keywords: [
      'котёнок', 'котенок', 'кошка', 'кот', 'породистая кошка',
      'британец', 'мейн-кун', 'сфинкс', 'шотландец', 'персидская'
    ],
    weight: 3
  },

  // === ДОМ И САД ===
  
  // Мебель
  {
    categorySlug: 'dom-sad',
    subcategorySlug: 'mebel',
    keywords: [
      'диван', 'кровать', 'шкаф', 'стол', 'стул', 'кресло',
      'комод', 'тумба', 'полка', 'матрас', 'кухня', 'кухонный гарнитур'
    ],
    weight: 3
  },

  // === РАБОТА ===
  
  // Вакансии
  {
    categorySlug: 'rabota',
    subcategorySlug: 'vakansii',
    keywords: [
      'вакансия', 'требуется', 'ищем', 'нужен', 'работа',
      'зарплата', 'от', 'оклад', 'график'
    ],
    weight: 3
  },
  
  // Резюме
  {
    categorySlug: 'rabota',
    subcategorySlug: 'rezyume',
    keywords: [
      'резюме', 'ищу работу', 'опыт работы', 'соискатель'
    ],
    weight: 3
  },

  // === УСЛУГИ ===
  
  // Строительство и ремонт
  {
    categorySlug: 'uslugi',
    subcategorySlug: 'stroitelstvo-remont',
    keywords: [
      'ремонт квартир', 'отделка', 'штукатурка', 'плитка',
      'сантехник', 'электрик', 'установка', 'монтаж'
    ],
    weight: 3
  },
  
  // Транспортные услуги
  {
    categorySlug: 'uslugi',
    subcategorySlug: 'transportnye-uslugi',
    keywords: [
      'грузоперевозки', 'переезд', 'доставка', 'грузчики',
      'газель', 'фургон', 'грузовик'
    ],
    weight: 3
  },
];
