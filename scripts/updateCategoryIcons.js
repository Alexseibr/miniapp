import Category from '../models/Category.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Mapping of category slugs to generated icon paths
const iconMappings = {
  // Top-level categories
  'nedvizhimost': '/attached_assets/generated_images/real_estate_house_icon.png',
  'uslugi': '/attached_assets/generated_images/services_tools_icon.png',
  'puteshestviya': '/attached_assets/generated_images/travel_airplane_icon.png',
  'remont-stroyka': '/attached_assets/generated_images/construction_repair_icon.png',
  'avto-zapchasti': '/attached_assets/generated_images/auto_parts_car_icon.png',
  'hobbi-sport-turizm': '/attached_assets/generated_images/hobby_sport_icon.png',
  'elektronika': '/attached_assets/generated_images/electronics_devices_icon.png',
  'bytovaya-tehnika': '/attached_assets/generated_images/appliances_icon.png',
  'dom-sad': '/attached_assets/generated_images/home_garden_icon.png',
  'krasota-zdorove-tovary': '/attached_assets/generated_images/beauty_health_icon.png',
  'odezhda-obuv': '/attached_assets/generated_images/clothes_fashion_icon.png',
  'rabota': '/attached_assets/generated_images/jobs_briefcase_icon.png',
  'tovary-dlya-detey': '/attached_assets/generated_images/kids_baby_icon.png',
  'zhivotnye': '/attached_assets/generated_images/pets_animals_icon.png',
  
  // Electronics subcategories
  'telefony-planshety': '/attached_assets/generated_images/smartphones_3d_icon.png',
  'noutbuki-kompyutery': '/attached_assets/generated_images/laptops_3d_icon.png',
  'tv-foto-video': '/attached_assets/generated_images/tv_3d_icon.png',
  'igry-igrovye-pristavki': '/attached_assets/generated_images/gaming_3d_icon.png',
  'audio-tehnika': '/attached_assets/generated_images/audio_3d_icon.png',
  
  // Auto categories
  'legkovye-avtomobili': '/attached_assets/generated_images/cars_3d_icon.png',
  'shiny-diski': '/attached_assets/generated_images/tires_3d_icon.png',
  'zapchasti-aksessuary': '/attached_assets/generated_images/spare_parts_3d_icon.png',
  
  // Appliances
  'krupnaya-bytovaya-tehnika': '/attached_assets/generated_images/appliances_washing_machine_icon.png',
  
  // Furniture and home
  'mebel': '/attached_assets/generated_images/furniture_3d_icon.png',
  
  // Kids categories
  'igrushki': '/attached_assets/generated_images/toys_3d_icon.png',
  'kolyaski-avtokresla': '/attached_assets/generated_images/baby_stroller_3d_icon.png',
  
  // Pets
  'sobaki': '/attached_assets/generated_images/dogs_3d_icon.png',
  'koshki': '/attached_assets/generated_images/cats_3d_icon.png',
  
  // Beauty
  'kosmetika-parfyumeriya': '/attached_assets/generated_images/beauty_cosmetics_icon.png',
  
  // Clothes
  'zhenskaya-odezhda': '/attached_assets/generated_images/women_clothing_3d_icon.png',
  'muzhskaya-odezhda': '/attached_assets/generated_images/men_clothing_3d_icon.png',
  'zhenskaya-obuv': '/attached_assets/generated_images/women_shoes_3d_icon.png',
  
  // Real estate
  'kvartiry': '/attached_assets/generated_images/apartments_3d_icon.png',
  'doma-dachi-kottedzhi': '/attached_assets/generated_images/houses_3d_icon.png',
  'uchastki': '/attached_assets/generated_images/land_plots_3d_icon.png',
  'garazhi-mashinomesta': '/attached_assets/generated_images/garages_3d_icon.png',
  
  // Travel
  'aviabilety': '/attached_assets/generated_images/flight_tickets_3d_icon.png',
  'gostinitsy-oteli': '/attached_assets/generated_images/hotels_3d_icon.png',
  'tury': '/attached_assets/generated_images/tours_3d_icon.png',
  
  // Construction
  'stroitelnye-materialy': '/attached_assets/generated_images/building_materials_3d_icon.png',
  'otdelochnye-materialy': '/attached_assets/generated_images/paint_tools_3d_icon.png',
  'santehnika': '/attached_assets/generated_images/plumbing_3d_icon.png',
  
  // Other
  'velosipedy': '/attached_assets/generated_images/bicycles_3d_icon.png',
  'rezyume': '/attached_assets/generated_images/resume_3d_icon.png',
};

async function updateCategoryIcons() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    console.log('\nUpdating category icons...\n');
    
    for (const [slug, iconPath] of Object.entries(iconMappings)) {
      const category = await Category.findOne({ slug });
      
      if (category) {
        await Category.updateOne(
          { slug },
          { $set: { icon3d: iconPath } }
        );
        console.log(`✓ Updated ${slug.padEnd(35)} → ${iconPath}`);
        updatedCount++;
      } else {
        console.log(`✗ Category not found: ${slug}`);
        notFoundCount++;
      }
    }
    
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Successfully updated: ${updatedCount} categories`);
    console.log(`Not found: ${notFoundCount} categories`);
    console.log(`Total mapped: ${Object.keys(iconMappings).length}`);
    
    // Show categories with and without icons
    const withIcons = await Category.find({ icon3d: { $ne: null } }).countDocuments();
    const withoutIcons = await Category.find({ icon3d: null }).countDocuments();
    const total = await Category.countDocuments();
    
    console.log('\n========================================');
    console.log('DATABASE STATUS');
    console.log('========================================');
    console.log(`Total categories: ${total}`);
    console.log(`With 3D icons: ${withIcons}`);
    console.log(`Without 3D icons: ${withoutIcons}`);
    console.log(`Coverage: ${((withIcons / total) * 100).toFixed(1)}%`);
    
    await mongoose.disconnect();
    console.log('\n✓ Database disconnected');
    console.log('✓ Icon update complete!');
  } catch (error) {
    console.error('Error updating icons:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateCategoryIcons();
