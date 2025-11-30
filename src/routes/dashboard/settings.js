const express = require('express');
const router = express.Router();

const isAuthController = require('../../middlewares/is_auth');
const setLocals = require('../../middlewares/setLocals');
const requireAuthz = require('../../middlewares/authz');
const settingsController = require('../../controllers/dashboard/settingsController');

// Dostęp do zaawansowanych ustawień tylko dla adminów/headAdmin/director
const SETTINGS_ROLES = ['admin', 'headAdmin', 'director'];
const onlyPlatformAdmins = [
  isAuthController,
  setLocals,
  requireAuthz({ anyRole: SETTINGS_ROLES })
];

// --- Dostęp do widoku ustawień ma każdy zalogowany ---
router.get('/', isAuthController, setLocals, settingsController.getSettings);

// Konto użytkownika (zmiana hasła) – każdy zalogowany
router.post('/account/password', isAuthController, setLocals, settingsController.updatePassword);

// Platforma - ustawienia kodów (zmiana ręczna)
router.post('/platform/month-code', ...onlyPlatformAdmins, settingsController.updateMonthCode);
router.post('/platform/root-code', ...onlyPlatformAdmins, settingsController.updateRootCode);

// Platforma - konfiguracja WSZYSTKICH kodów (nowa, uniwersalna funkcja!)
router.post('/platform/codes-config', ...onlyPlatformAdmins, settingsController.updateCodesConfig);

// Platforma - generowanie miesięcznego kodu
router.post('/platform/generate-month-code', ...onlyPlatformAdmins, settingsController.generateMonthCode);

// (opcjonalnie) Platforma - generowanie kodu root
// router.post('/platform/generate-root-code', ...onlyPlatformAdmins, settingsController.generateRootCode);

// (opcjonalnie) Platforma - generowanie kodu deaktywacji
// router.post('/platform/generate-deactivation-code', ...onlyPlatformAdmins, settingsController.generateDeactivationCode);

module.exports = router;
