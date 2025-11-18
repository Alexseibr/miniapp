import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const BOT_TOKEN = process.env.BOT_TOKEN || '';
export const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/miniapp';
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
