import { Schema, model, Document } from 'mongoose';

export interface IUser {
  telegramId: string;
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
    telegramId: { type: String, required: true, unique: true },
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    avatarUrl: { type: String },
    phone: { type: String },
    email: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = model<IUserDocument>('User', UserSchema);

export default User;
