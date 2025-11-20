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
    phone: { type: String, unique: true, sparse: true },
    telegramId: { type: String, unique: true, sparse: true },
    telegramUsername: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    avatar: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    username: { type: String },
    name: { type: String },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = model<IUserDocument>('User', UserSchema);

export default User;
