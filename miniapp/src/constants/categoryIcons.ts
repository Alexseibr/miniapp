// DEPRECATED: Use icon3d from API instead
// This file is kept as fallback for categories without icon3d field
// 3D Category Icons Mapping (WebP optimized)
import realEstateIcon from '@/assets/categories/real-estate.webp';
import servicesIcon from '@/assets/categories/services.webp';
import travelIcon from '@/assets/categories/travel.webp';
import repairIcon from '@/assets/categories/repair.webp';
import autoIcon from '@/assets/categories/auto.webp';
import hobbySportIcon from '@/assets/categories/hobby-sport.webp';
import electronicsIcon from '@/assets/categories/electronics.webp';
import appliancesIcon from '@/assets/categories/appliances.webp';
import clothesIcon from '@/assets/categories/clothes.webp';
import homeGardenIcon from '@/assets/categories/home-garden.webp';
import kidsIcon from '@/assets/categories/kids.webp';
import petsIcon from '@/assets/categories/pets.webp';
import beautyIcon from '@/assets/categories/beauty.webp';
import jobsIcon from '@/assets/categories/jobs.webp';

import apartmentsIcon from '@/assets/categories/subcategories/kvartiry.webp';
import housesIcon from '@/assets/categories/subcategories/doma-dachi-kottedzhi.webp';
import landIcon from '@/assets/categories/subcategories/uchastki.webp';
import garagesIcon from '@/assets/categories/subcategories/garazhi-mashinomesta.webp';
import carsIcon from '@/assets/categories/subcategories/legkovye-avtomobili.webp';
import sparePartsIcon from '@/assets/categories/subcategories/zapchasti-aksessuary.webp';
import tiresIcon from '@/assets/categories/subcategories/shiny-diski.webp';
import phonesIcon from '@/assets/categories/subcategories/telefony-planshety.webp';
import laptopsIcon from '@/assets/categories/subcategories/noutbuki-kompyutery.webp';
import tvIcon from '@/assets/categories/subcategories/tv-foto-video.webp';
import gamingIcon from '@/assets/categories/subcategories/igry-igrovye-pristavki.webp';
import audioIcon from '@/assets/categories/subcategories/audio-tehnika.webp';
import womenClothesIcon from '@/assets/categories/subcategories/zhenskaya-odezhda.webp';
import menClothesIcon from '@/assets/categories/subcategories/muzhskaya-odezhda.webp';
import womenShoesIcon from '@/assets/categories/subcategories/zhenskaya-obuv.webp';
import largeAppliancesIcon from '@/assets/categories/subcategories/krupnaya-bytovaya-tehnika.webp';
import furnitureIcon from '@/assets/categories/subcategories/mebel.webp';
import dogsIcon from '@/assets/categories/subcategories/sobaki.webp';
import catsIcon from '@/assets/categories/subcategories/koshki.webp';
import toysIcon from '@/assets/categories/subcategories/igrushki.webp';
import strollersIcon from '@/assets/categories/subcategories/kolyaski-avtokresla.webp';
import constructionServicesIcon from '@/assets/categories/subcategories/stroitelstvo-remont.webp';
import buildingMaterialsIcon from '@/assets/categories/subcategories/stroitelnye-materialy.webp';
import finishingMaterialsIcon from '@/assets/categories/subcategories/otdelochnye-materialy.webp';
import plumbingIcon from '@/assets/categories/subcategories/santehnika.webp';
import toursIcon from '@/assets/categories/subcategories/tury.webp';
import flightTicketsIcon from '@/assets/categories/subcategories/aviabilety.webp';
import hotelsIcon from '@/assets/categories/subcategories/gostinitsy-oteli.webp';
import bicyclesIcon from '@/assets/categories/subcategories/velosipedy.webp';
import resumeIcon from '@/assets/categories/subcategories/rezyume.webp';

import oneRoomIcon from '@/assets/categories/level3/1-komnatnye.webp';
import twoRoomIcon from '@/assets/categories/level3/2-komnatnye.webp';
import threeRoomIcon from '@/assets/categories/level3/3-komnatnye.webp';
import studioIcon from '@/assets/categories/level3/studii.webp';
import sedanIcon from '@/assets/categories/level3/sedan.webp';
import suvIcon from '@/assets/categories/level3/vnedorozhnik.webp';
import hatchbackIcon from '@/assets/categories/level3/hetchbek.webp';
import coupeIcon from '@/assets/categories/level3/kupe.webp';
import wagonIcon from '@/assets/categories/level3/universal.webp';
import smartphoneIcon from '@/assets/categories/level3/smartfony.webp';
import tabletIcon from '@/assets/categories/level3/planshety.webp';

import withRenovationIcon from '@/assets/categories/level4/s-remontom.webp';
import noRenovationIcon from '@/assets/categories/level4/bez-remonta.webp';
import newBuildingIcon from '@/assets/categories/level4/novostroyka.webp';

export const CATEGORY_ICONS: Record<string, string> = {
  'nedvizhimost': realEstateIcon,
  'uslugi': servicesIcon,
  'puteshestviya': travelIcon,
  'remont-stroyka': repairIcon,
  'avto-zapchasti': autoIcon,
  'hobbi-sport-turizm': hobbySportIcon,
  'elektronika': electronicsIcon,
  'bytovaya-tehnika': appliancesIcon,
  'odezhda-obuv': clothesIcon,
  'dom-sad': homeGardenIcon,
  'tovary-dlya-detey': kidsIcon,
  'zhivotnye': petsIcon,
  'krasota-zdorove-tovary': beautyIcon,
  'rabota': jobsIcon,
  
  'kvartiry': apartmentsIcon,
  'doma-dachi-kottedzhi': housesIcon,
  'uchastki': landIcon,
  'garazhi-mashinomesta': garagesIcon,
  
  'realty_rent': apartmentsIcon,
  'realty_rent_daily': hotelsIcon,
  'realty_rent_long': apartmentsIcon,
  'legkovye-avtomobili': carsIcon,
  'zapchasti-aksessuary': sparePartsIcon,
  'shiny-diski': tiresIcon,
  'telefony-planshety': phonesIcon,
  'noutbuki-kompyutery': laptopsIcon,
  'tv-foto-video': tvIcon,
  'igry-igrovye-pristavki': gamingIcon,
  'audio-tehnika': audioIcon,
  'zhenskaya-odezhda': womenClothesIcon,
  'muzhskaya-odezhda': menClothesIcon,
  'zhenskaya-obuv': womenShoesIcon,
  'krupnaya-bytovaya-tehnika': largeAppliancesIcon,
  'mebel': furnitureIcon,
  'sobaki': dogsIcon,
  'koshki': catsIcon,
  'igrushki': toysIcon,
  'kolyaski-avtokresla': strollersIcon,
  'stroitelstvo-remont': constructionServicesIcon,
  'stroitelnye-materialy': buildingMaterialsIcon,
  'otdelochnye-materialy': finishingMaterialsIcon,
  'santehnika': plumbingIcon,
  'tury': toursIcon,
  'aviabilety': flightTicketsIcon,
  'gostinitsy-oteli': hotelsIcon,
  'velosipedy': bicyclesIcon,
  'rezyume': resumeIcon,
  
  '1-komnatnye': oneRoomIcon,
  '2-komnatnye': twoRoomIcon,
  '3-komnatnye': threeRoomIcon,
  'studii': studioIcon,
  'sedan': sedanIcon,
  'vnedorozhnik': suvIcon,
  'hetchbek': hatchbackIcon,
  'kupe': coupeIcon,
  'universal': wagonIcon,
  'smartfony': smartphoneIcon,
  'planshety': tabletIcon,
  
  's-remontom': withRenovationIcon,
  'bez-remonta': noRenovationIcon,
  'novostroyka': newBuildingIcon,
};
