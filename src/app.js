// ===========================
// 📦 Moduły podstawowe i konfiguracja
// ===========================
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const path = require('path');
const favicon = require('serve-favicon');
const methodOverride = require('method-override');
const cron = require('node-cron');
require('dotenv').config();

const { PORT, MONGODB_URI, SESSION_SECRET, APP_NAME, APP_AUTHOR } = require('./config/env.js');
const { version } = require('../package.json');

// ===========================
// 🔗 Middleware
// ===========================
const errorHandler = require('./middlewares/errorHandler');
const setFlashMessage = require('./middlewares/setFlashMessage');

// ===========================
// 🗂️ Modele
// ===========================
const User = require('../src/models/userModel');

// ===========================
// 🌐 Kontrolery narzędziowe
// ===========================
// const { createMainUser } = require('./utils/createMainUser');
const { ensureMonthlyCode } = require('./utils/monthlyCodeManager');
const permissions = require('./utils/permissions'); // Dodajemy

// ===========================
// 🛣️ Trasy
// ===========================
const authRoutes = require('../src/routes/auth');
const dashboardIndexRoutes = require('./routes/dashboard/index');
const dashboardWorkingHoursRoutes = require('./routes/dashboard/workhours.js');
const dashboardScheduleRoutes = require('./routes/dashboard/schedule');
const dashboardEmployeesRoutes = require('./routes/dashboard/employees');
const dashboardFacilitiesRoutes = require('./routes/dashboard/facilities');
const dashboardSettingsRoutes = require('./routes/dashboard/settings');
const facilityApiRoutes = require('./routes/api/facilityRoutes');

// ===========================
// 🚀 Inicjalizacja aplikacji Express
// ===========================
const app = express();

// ===========================
// 📊 Ustawienia globalne aplikacji
// ===========================
app.locals.appVersion = version;
app.locals.appTitle = APP_NAME;
app.locals.appAuthor = APP_AUTHOR;

// ===========================
// ⚙️ Ustawienia widoków
// ===========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===========================
// 🧩 Middleware globalne
// ===========================
app.use(express.urlencoded({ extended: true })); // Parsowanie danych formularza
app.use(express.static(path.join(__dirname, '..', 'public'))); // Static
app.use(favicon(path.join(__dirname, '..', 'public', 'favicon.ico'))); // favicon

// 🗝️ Session store w MongoDB
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions',
});

// 🛡️ Konfiguracja sesji
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

// Flash messages
app.use(setFlashMessage);

// 🔄 Obsługa PUT/DELETE przez methodOverride
app.use(methodOverride('_method'));

// ===========================
// 👤 Permissions helpers do widoków
// ===========================
app.use((req, res, next) => {
  res.locals.hasRole = permissions.hasRole;
  res.locals.hasAnyRole = permissions.hasAnyRole;
  res.locals.hasPermission = permissions.hasPermission;
  next();
});

// ===========================
// 🚏 Routing główny
// ===========================

// Przekierowanie na /login jako główny entrypoint
app.get('/', (req, res) => res.redirect('/login'));

// Trasy autoryzacyjne (logowanie, rejestracja)
app.use(authRoutes);

// API – pobieranie grup/klas z placówki
app.use('/api/facilities', facilityApiRoutes);

// Dashboard (panel administracyjny)
app.use('/dashboard', dashboardIndexRoutes);
app.use('/dashboard/schedule', dashboardScheduleRoutes);
app.use('/dashboard/workhours', dashboardWorkingHoursRoutes);
app.use('/dashboard/employees', dashboardEmployeesRoutes);
app.use('/dashboard/facilities', dashboardFacilitiesRoutes);
app.use('/dashboard/settings', dashboardSettingsRoutes);

// ===========================
// 🛑 Trasa błędu 404 (jeśli nic nie pasuje)
// ===========================
app.use((req, res, next) => {
  const error = new Error('Strona nie została znaleziona');
  error.status = 404;
  error.title = 'Błąd 404 - Nie znaleziono';
  next(error);
});

// ===========================
// 🛡️ Globalna obsługa błędów
// ===========================
app.use(errorHandler);

// ===========================
// 🛢️ Połączenie z MongoDB i start serwera
// ===========================
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Połączono z bazą danych');

    // CRON: 1. dnia każdego miesiąca o 00:00 sprawdza/generuje kod miesięczny
    cron.schedule('0 0 1 * *', async () => {
      console.log('🔁 CRON: Sprawdzam kod miesięczny...');
      await ensureMonthlyCode();
    });

    app.listen(PORT, () => {
      console.log(`🚀 Serwer działa na porcie ${PORT}`);
      ensureMonthlyCode();
    });
  })
  .catch((err) => {
    console.log(err);
  });
