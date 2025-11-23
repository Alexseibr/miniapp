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
};
