import { httpClient } from './httpClient';

export interface City {
  code: string;
  name: string;
}

export const cityApi = {
  getCity: (code: string) => httpClient.get<City>(`/city/${code}`),
  getCities: () => httpClient.get<City[]>('/city')
};
