export interface CityTheme {
  primaryColor?: string;
  logoUrl?: string;
}

export interface CityFeatures {
  enableFarmers?: boolean;
  enableCrafts?: boolean;
  enableTaxi?: boolean;
  [key: string]: boolean | undefined;
}

export interface CityConfig {
  code: string;
  name: string;
  theme?: CityTheme;
  features?: CityFeatures;
}
