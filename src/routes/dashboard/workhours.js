const express = require('express');
const router = express.Router();
const workHourController = require('../../controllers/dashboard/workHourController');
const isAuthController = require('../../middlewares/is_auth');
const setLocals = require('../../middlewares/setLocals');
const requireAuthz = require('../../middlewares/authz');

// Główny widok zakładki godzin pracy
router.get(
  '/',
  isAuthController,
  setLocals,
  workHourController.getMainView
);

// Moje godziny (widok pracownika)
router.get(
  '/me',
  isAuthController,
  setLocals,
  workHourController.getMyHours
);

// Admin/dyrekcja – widok dodawania
router.get(
  '/add',
  isAuthController, setLocals,
  requireAuthz({ anyRole: ['admin', 'headAdmin', 'director'] }),
  workHourController.getAddHoursView
);

router.post(
  '/add',
  isAuthController, setLocals,
  requireAuthz({ anyRole: ['admin', 'headAdmin', 'director'] }),
  workHourController.addWorkHourEntry
);

// (Przyszłościowo) - Lista wszystkich wpisów
// router.get(
//   '/all',
//   isAuthController, setLocals,
//   requireAuthz({ anyRole: ['admin', 'headAdmin', 'director'] }),
//   workHourController.getAllEntries
// );

module.exports = router;
