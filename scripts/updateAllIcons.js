import Category from '../models/Category.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Comprehensive icon mapping for ALL 111 categories
// Maps category slug to icon path
const iconMappings = {
  // Existing 44 icons (keep existing paths)
  'kvartiry': '/attached_assets/generated_images/apartments_3d_icon.png',
  'doma-dachi-kottedzhi': '/attached_assets/generated_images/houses_3d_icon.png',
  'garazhi-mashinomesta': '/attached_assets/generated_images/garages_3d_icon.png',
  'uchastki': '/attached_assets/generated_images/land_plots_3d_icon.png',
  'legkovye-avtomobili': '/attached_assets/generated_images/cars_3d_icon.png',
  'zapchasti-aksessuary': '/attached_assets/generated_images/spare_parts_3d_icon.png',
  'shiny-diski': '/attached_assets/generated_images/tires_3d_icon.png',
  'noutbuki-kompyutery': '/attached_assets/generated_images/laptops_3d_icon.png',
  'telefony-planshety': '/attached_assets/generated_images/phones_and_tablets_icon.png',
  'tv-foto-video': '/attached_assets/generated_images/tv_3d_icon.png',
  'audio-tehnika': '/attached_assets/generated_images/audio_3d_icon.png',
  'krupnaya-bytovaya-tehnika': '/attached_assets/generated_images/appliances_icon.png',
  'mebel': '/attached_assets/generated_images/furniture_3d_icon.png',
  'zhenskaya-odezhda': '/attached_assets/generated_images/women_clothing_3d_icon.png',
  'muzhskaya-odezhda': '/attached_assets/generated_images/men_clothing_3d_icon.png',
  'zhenskaya-obuv': '/attached_assets/generated_images/women_shoes_3d_icon.png',
  'koshki': '/attached_assets/generated_images/cats_3d_icon.png',
  'sobaki': '/attached_assets/generated_images/dogs_3d_icon.png',
  'kolyaski-avtokresla': '/attached_assets/generated_images/baby_stroller_3d_icon.png',
  'igrushki': '/attached_assets/generated_images/toys_3d_icon.png',
  'stroitelnye-materialy': '/attached_assets/generated_images/building_materials_icon.png',
  'stroitelstvo-remont': '/attached_assets/generated_images/construction_services_icon.png',
  'otdelochnye-materialy': '/attached_assets/generated_images/finishing_materials_icon.png',
  'santehnika': '/attached_assets/generated_images/plumbing_icon.png',
  'instrument': '/attached_assets/generated_images/tools_icon.png',
  'velosipedy': '/attached_assets/generated_images/bicycles_3d_icon.png',
  'igry-igrovye-pristavki': '/attached_assets/generated_images/gaming_3d_icon.png',
  'aviabilety': '/attached_assets/generated_images/flight_tickets_3d_icon.png',
  'gostinitsy-oteli': '/attached_assets/generated_images/hotels_3d_icon.png',
  'tury': '/attached_assets/generated_images/tours_icon.png',
  'rezyume': '/attached_assets/generated_images/resume_icon.png',
  'parfyumeriya-kosmetika': '/attached_assets/generated_images/perfume_and_cosmetics_icon.png',
  
  // Level 1 categories (14 total)
  'avto-zapchasti': '/attached_assets/generated_images/auto_parts_car_icon.png',
  'bytovaya-tehnika': '/attached_assets/generated_images/appliances_icon.png',
  'dom-sad': '/attached_assets/generated_images/home_garden_icon.png',
  'zhivotnye': '/attached_assets/generated_images/pets_animals_icon.png',
  'krasota-zdorove-tovary': '/attached_assets/generated_images/beauty_health_icon.png',
  'nedvizhimost': '/attached_assets/generated_images/real_estate_house_icon.png',
  'odezhda-obuv': '/attached_assets/generated_images/clothes_fashion_icon.png',
  'puteshestviya': '/attached_assets/generated_images/travel_airplane_icon.png',
  'rabota': '/attached_assets/generated_images/jobs_briefcase_icon.png',
  'remont-stroyka': '/attached_assets/generated_images/construction_repair_icon.png',
  'tovary-dlya-detey': '/attached_assets/generated_images/kids_baby_icon.png',
  'uslugi': '/attached_assets/generated_images/services_tools_icon.png',
  'hobbi-sport-turizm': '/attached_assets/generated_images/hobby_sport_icon.png',
  'elektronika': '/attached_assets/generated_images/electronics_devices_icon.png',
  
  // Newly generated 67 icons
  'avtobusnye-bilety': '/attached_assets/generated_images/bus_tickets_icon.png',
  'avtoelektronika': '/attached_assets/generated_images/car_electronics_icon.png',
  'akvarium-rybki': '/attached_assets/generated_images/aquarium_and_fish_icon.png',
  'aksessuary': '/attached_assets/generated_images/fashion_accessories_icon.png',
  'realty_rent': '/attached_assets/generated_images/rental_properties_icon.png',
  'biznes-uslugi': '/attached_assets/generated_images/business_services_icon.png',
  'vakansii': '/attached_assets/generated_images/job_vacancies_icon.png',
  'gruzovye-avtomobili': '/attached_assets/generated_images/trucks_icon.png',
  'dveri-okna': '/attached_assets/generated_images/doors_and_windows_icon.png',
  'dekor-tekstil': '/attached_assets/generated_images/decor_and_textiles_icon.png',
  'detskaya-mebel': '/attached_assets/generated_images/children\'s_furniture_icon.png',
  'detskaya-obuv': '/attached_assets/generated_images/children\'s_shoes_icon.png',
  'detskaya-odezhda': '/attached_assets/generated_images/children\'s_clothing_icon.png',
  'detskoe-pitanie': '/attached_assets/generated_images/baby_food_icon.png',
  'drugie-zhivotnye': '/attached_assets/generated_images/other_animals_icon.png',
  'zhd-bilety': '/attached_assets/generated_images/train_tickets_icon.png',
  'klimaticheskaya-tehnika': '/attached_assets/generated_images/climate_control_icon.png',
  'kollektsionirovanie': '/attached_assets/generated_images/collectibles_icon.png',
  'kommercheskaya-nedvizhimost': '/attached_assets/generated_images/commercial_real_estate_icon.png',
  'komnaty': '/attached_assets/generated_images/rooms_icon.png',
  'krasota-zdorove': '/attached_assets/generated_images/beauty_and_health_icon.png',
  'medtekhnika-optika': '/attached_assets/generated_images/medical_equipment_icon.png',
  'melkaya-bytovaya-tehnika': '/attached_assets/generated_images/small_appliances_icon.png',
  'mototehnika': '/attached_assets/generated_images/motorcycles_icon.png',
  'muzhskaya-obuv': '/attached_assets/generated_images/men\'s_shoes_icon.png',
  'muzykalnye-instrumenty': '/attached_assets/generated_images/musical_instruments_icon.png',
  'nedvizhimost-za-rubezhom': '/attached_assets/generated_images/real_estate_abroad_icon.png',
  'obuchenie-kursy': '/attached_assets/generated_images/education_icon.png',
  'oxota-rybalka': '/attached_assets/generated_images/hunting_and_fishing_icon.png',
  'perevozki-transportirovka': '/attached_assets/generated_images/transportation_services_icon.png',
  'posutochnaya-arenda': '/attached_assets/generated_images/daily_rentals_icon.png',
  'ptitsy': '/attached_assets/generated_images/birds_icon.png',
  'realty_rent_long': '/attached_assets/generated_images/long-term_rental_icon.png',
  'remont-tehniki': '/attached_assets/generated_images/equipment_repair_icon.png',
  'selskokhozyaystvennaya-tehnika': '/attached_assets/generated_images/agricultural_equipment_icon.png',
  'semena-rasteniya': '/attached_assets/generated_images/seeds_and_plants_icon.png',
  'sertifikaty-kupony': '/attached_assets/generated_images/certificates_and_coupons_icon.png',
  'sportivnaya-odezhda-obuv': '/attached_assets/generated_images/sports_clothing_icon.png',
  'sportivnoe-oborudovanie': '/attached_assets/generated_images/sports_equipment_icon.png',
  'tekhnologicheskoe-oborudovanie': '/attached_assets/generated_images/industrial_equipment_icon.png',
  'tovary-dlya-zhivotnyh': '/attached_assets/generated_images/pet_supplies_icon.png',
  'transportnye-sredstva-drugoe': '/attached_assets/generated_images/other_vehicles_icon.png',
  'turizm': '/attached_assets/generated_images/tourism_icon.png',
  'uslugi-krasoty-zdorovya': '/attached_assets/generated_images/beauty_services_icon.png',
  'fitnes-yoga': '/attached_assets/generated_images/fitness_and_yoga_icon.png',
  'fototehnika-kino': '/attached_assets/generated_images/photo_equipment_icon.png',
  'khimiya-gigiena': '/attached_assets/generated_images/chemicals_and_hygiene_icon.png',
  'khlopoty-tsennosti': '/attached_assets/generated_images/hobby_collectibles_icon.png',
  
  // Level 3 categories
  '1-komnatnye': '/attached_assets/generated_images/1-room_apartments_icon.png',
  '2-komnatnye': '/attached_assets/generated_images/2-room_apartments_icon.png',
  '3-komnatnye': '/attached_assets/generated_images/3-room_apartments_icon.png',
  'vnedorozhnik': '/attached_assets/generated_images/suv_vehicles_icon.png',
  'kupe': '/attached_assets/generated_images/coupe_cars_icon.png',
  'planshety': '/attached_assets/generated_images/tablets_icon.png',
  'realty_rent_daily': '/attached_assets/generated_images/daily_rentals_icon.png',
  'sedan': '/attached_assets/generated_images/auto_car_icon.png',
  'smartfony': '/attached_assets/generated_images/smartphones_3d_icon.png',
  'studii': '/attached_assets/generated_images/apartments_3d_icon.png',
  'universal': '/attached_assets/generated_images/auto_car_icon.png',
  'hetchbek': '/attached_assets/generated_images/auto_car_icon.png',
  
  // Level 4 categories
  'bez-remonta': '/attached_assets/generated_images/apartments_3d_icon.png',
  'novostroyka': '/attached_assets/generated_images/apartments_3d_icon.png',
  's-remontom': '/attached_assets/generated_images/apartments_3d_icon.png',
  
  // Additional 18 icons generated in batches 8-9
  'elektroinstrument': '/attached_assets/generated_images/power_tools_icon.png',
  'foto-video-uslugi': '/attached_assets/generated_images/photo_video_services_icon.png',
  'posuda-kuhonnye-prinadlezhnosti': '/attached_assets/generated_images/dishes_kitchenware_icon.png',
  'prazdniki-meropriyatiya': '/attached_assets/generated_images/holidays_events_icon.png',
  'produkty-pitaniya': '/attached_assets/generated_images/food_products_icon.png',
  'rasteniya': '/attached_assets/generated_images/plants_gardening_icon.png',
  'spetstekhnika': '/attached_assets/generated_images/special_equipment_icon.png',
  'sport-otdyh': '/attached_assets/generated_images/sports_recreation_icon.png',
  'tehnika-dlya-kuhni': '/attached_assets/generated_images/kitchen_appliances_icon.png',
  'tovary-dlya-kompyutera': '/attached_assets/generated_images/computer_accessories_icon.png',
  'tovary-dlya-novorozhdjonnykh': '/attached_assets/generated_images/newborn_products_icon.png',
  'tovary-dlya-sada': '/attached_assets/generated_images/garden_supplies_icon.png',
  'tovary-dlya-zhivotnykh': '/attached_assets/generated_images/pet_supplies_products_icon.png',
  'transportnye-uslugi': '/attached_assets/generated_images/transport_services_icon.png',
  'trenazhjery': '/attached_assets/generated_images/exercise_equipment_icon.png',
  'ukhod-za-telom-volosami': '/attached_assets/generated_images/body_hair_care_icon.png',
  'uslugi-nyani-sidelki': '/attached_assets/generated_images/nanny_caregiver_services_icon.png',
  'uslugi-po-domu': '/attached_assets/generated_images/home_services_icon.png',
};

async function updateAllIcons() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    let updated = 0;
    let notFound = 0;
    let alreadyHasIcon = 0;
    
    console.log('\n========================================');
    console.log('UPDATING CATEGORY ICONS');
    console.log('========================================\n');
    
    for (const [slug, icon3d] of Object.entries(iconMappings)) {
      const category = await Category.findOne({ slug });
      
      if (!category) {
        console.log(`❌ Category not found: ${slug}`);
        notFound++;
        continue;
      }
      
      if (category.icon3d) {
        console.log(`ℹ️  ${slug.padEnd(35)} | Already has icon: ${category.icon3d}`);
        alreadyHasIcon++;
        continue;
      }
      
      await Category.updateOne(
        { slug },
        { $set: { icon3d } }
      );
      
      console.log(`✓ Updated ${slug.padEnd(35)} | Icon: ${icon3d}`);
      updated++;
    }
    
    // Get final statistics
    const totalCategories = await Category.countDocuments();
    const categoriesWithIcons = await Category.countDocuments({ icon3d: { $ne: null } });
    const categoriesWithoutIcons = await Category.countDocuments({ icon3d: null });
    
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Total categories in database: ${totalCategories}`);
    console.log(`Categories with icons: ${categoriesWithIcons}`);
    console.log(`Categories without icons: ${categoriesWithoutIcons}`);
    console.log(`\nUpdated in this run: ${updated}`);
    console.log(`Already had icons: ${alreadyHasIcon}`);
    console.log(`Not found: ${notFound}`);
    console.log(`Icon coverage: ${((categoriesWithIcons / totalCategories) * 100).toFixed(1)}%`);
    
    await mongoose.disconnect();
    console.log('\n✓ Database disconnected');
    console.log('✓ Icon update complete!');
  } catch (error) {
    console.error('Error updating icons:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateAllIcons();
