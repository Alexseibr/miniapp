const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/miniapp';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

module.exports = {
  PORT,
  BOT_TOKEN,
  MONGO_URL,
  API_BASE_URL,
};
