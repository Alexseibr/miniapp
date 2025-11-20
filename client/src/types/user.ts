export type CurrentUser = {
  id: string;
  _id?: string;
  telegramId?: string;
  telegramUsername?: string | null;
  username?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatar?: string | null;
  phone?: string | null;
  role?: string;
};
