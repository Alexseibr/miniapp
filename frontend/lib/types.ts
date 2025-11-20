export type AdOwner = {
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  telegramId?: string;
};

export type Ad = {
  _id: string;
  title: string;
  description: string;
  price: number;
  category?: string;
  subcategory?: string;
  seasonCode?: string;
  photos?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type SeoAlternateLang = {
  hrefLang: string;
  href: string;
};
