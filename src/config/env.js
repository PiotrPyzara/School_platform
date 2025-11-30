// src/config/env.js

const dotenv = require('dotenv');

// Ładuje zmienne z pliku .env w katalogu głównym
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI,
  SESSION_SECRET: process.env.SESSION_SECRET || 'defaultSecret',
  APP_NAME: process.env.APP_NAME || 'Brak danych',
  APP_AUTHOR: process.env.APP_AUTHOR || 'Brak danych',
  AUTH_SECRET: process.env.AUTH_SECRET || 'Brak',
};
