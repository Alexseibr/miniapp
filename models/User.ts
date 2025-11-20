import { Schema, model, Document } from 'mongoose';

export interface IUser {
  phone?: string;
  telegramId?: string;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  role?: 'user' | 'admin';
  username?: string;
  name?: string;
  isBlocked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    phone: { type: String, unique: true, sparse: true, trim: true },
    telegramId: { type: String, unique: true, sparse: true, trim: true },
    telegramUsername: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    avatar: { type: String, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    username: { type: String, trim: true },
    name: { type: String, trim: true },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = model<IUserDocument>('User', UserSchema);

export async function initUserIndexes(): Promise<void> {
  await User.syncIndexes();
}

export default User;
