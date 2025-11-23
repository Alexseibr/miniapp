// 3D Category Icons Mapping
import realEstateIcon from '@/assets/categories/real-estate.png';
import servicesIcon from '@/assets/categories/services.png';
import travelIcon from '@/assets/categories/travel.png';
import repairIcon from '@/assets/categories/repair.png';
import autoIcon from '@/assets/categories/auto.png';
import hobbySportIcon from '@/assets/categories/hobby-sport.png';
import electronicsIcon from '@/assets/categories/electronics.png';
import appliancesIcon from '@/assets/categories/appliances.png';
import clothesIcon from '@/assets/categories/clothes.png';
import homeGardenIcon from '@/assets/categories/home-garden.png';
import kidsIcon from '@/assets/categories/kids.png';
import petsIcon from '@/assets/categories/pets.png';
import beautyIcon from '@/assets/categories/beauty.png';
import jobsIcon from '@/assets/categories/jobs.png';

import apartmentsIcon from '@/assets/categories/subcategories/kvartiry.png';
import housesIcon from '@/assets/categories/subcategories/doma-dachi-kottedzhi.png';
import landIcon from '@/assets/categories/subcategories/uchastki.png';
import garagesIcon from '@/assets/categories/subcategories/garazhi-mashinomesta.png';
import carsIcon from '@/assets/categories/subcategories/legkovye-avtomobili.png';
import sparePartsIcon from '@/assets/categories/subcategories/zapchasti-aksessuary.png';
import tiresIcon from '@/assets/categories/subcategories/shiny-diski.png';
import phonesIcon from '@/assets/categories/subcategories/telefony-planshety.png';
import laptopsIcon from '@/assets/categories/subcategories/noutbuki-kompyutery.png';
import tvIcon from '@/assets/categories/subcategories/tv-foto-video.png';
import gamingIcon from '@/assets/categories/subcategories/igry-igrovye-pristavki.png';
import audioIcon from '@/assets/categories/subcategories/audio-tehnika.png';
import womenClothesIcon from '@/assets/categories/subcategories/zhenskaya-odezhda.png';
import menClothesIcon from '@/assets/categories/subcategories/muzhskaya-odezhda.png';
import womenShoesIcon from '@/assets/categories/subcategories/zhenskaya-obuv.png';
import largeAppliancesIcon from '@/assets/categories/subcategories/krupnaya-bytovaya-tehnika.png';
import furnitureIcon from '@/assets/categories/subcategories/mebel.png';
import dogsIcon from '@/assets/categories/subcategories/sobaki.png';
import catsIcon from '@/assets/categories/subcategories/koshki.png';
import toysIcon from '@/assets/categories/subcategories/igrushki.png';
import strollersIcon from '@/assets/categories/subcategories/kolyaski-avtokresla.png';
import constructionServicesIcon from '@/assets/categories/subcategories/stroitelstvo-remont.png';
import buildingMaterialsIcon from '@/assets/categories/subcategories/stroitelnye-materialy.png';
import finishingMaterialsIcon from '@/assets/categories/subcategories/otdelochnye-materialy.png';
import plumbingIcon from '@/assets/categories/subcategories/santehnika.png';
import toursIcon from '@/assets/categories/subcategories/tury.png';
import flightTicketsIcon from '@/assets/categories/subcategories/aviabilety.png';
import hotelsIcon from '@/assets/categories/subcategories/gostinitsy-oteli.png';
import bicyclesIcon from '@/assets/categories/subcategories/velosipedy.png';
import resumeIcon from '@/assets/categories/subcategories/rezyume.png';

import oneRoomIcon from '@/assets/categories/level3/1-komnatnye.png';
import twoRoomIcon from '@/assets/categories/level3/2-komnatnye.png';
import threeRoomIcon from '@/assets/categories/level3/3-komnatnye.png';
import studioIcon from '@/assets/categories/level3/studii.png';
import sedanIcon from '@/assets/categories/level3/sedan.png';
import suvIcon from '@/assets/categories/level3/vnedorozhnik.png';
import hatchbackIcon from '@/assets/categories/level3/hetchbek.png';
import coupeIcon from '@/assets/categories/level3/kupe.png';
import wagonIcon from '@/assets/categories/level3/universal.png';
import smartphoneIcon from '@/assets/categories/level3/smartfony.png';
import tabletIcon from '@/assets/categories/level3/planshety.png';

import withRenovationIcon from '@/assets/categories/level4/s-remontom.png';
import noRenovationIcon from '@/assets/categories/level4/bez-remonta.png';
import newBuildingIcon from '@/assets/categories/level4/novostroyka.png';

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
