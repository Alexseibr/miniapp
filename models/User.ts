import { Schema, model, Document } from 'mongoose';

export interface IUser {
  telegramId?: string;
  telegramUsername?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phone?: string;
  email?: string;
  role?: 'user' | 'admin';
  isBlocked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    telegramId: { type: String, unique: true, sparse: true },
    telegramUsername: { type: String },
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    avatarUrl: { type: String },
    phone: { type: String, unique: true, sparse: true },
    email: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = model<IUserDocument>('User', UserSchema);

export default User;
