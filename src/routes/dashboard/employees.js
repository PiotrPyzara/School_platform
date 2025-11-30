const express = require('express');
const router = express.Router();

const isAuthController = require('../../middlewares/is_auth');
const setLocals = require('../../middlewares/setLocals');
const requireAuthz = require('../../middlewares/authz');

const employeesController = require('../../controllers/dashboard/employeesController');

// ---- Grupa wspólnych middleware dla pracowniczych tras ----
const EMPLOYEE_ADMINS = ['admin', 'headAdmin', 'director']; // poprawiona rola
const onlyEmployeeAdmins = [
  isAuthController,
  setLocals,
  requireAuthz({ anyRole: EMPLOYEE_ADMINS })
];

// Lista pracowników
router.get(
  '/',
  ...onlyEmployeeAdmins,
  employeesController.getEmployees
);

// Formularz tworzenia pracownika
router.get(
  '/create',
  ...onlyEmployeeAdmins,
  employeesController.getCreateEmployee
);

// Obsługa tworzenia (POST)
router.post(
  '/create',
  ...onlyEmployeeAdmins,
  employeesController.postCreateEmployee
);

// Podsumowanie tworzenia użytkownika
router.get(
  '/created',
  ...onlyEmployeeAdmins,
  employeesController.getCreatedEmployeeSummary
);

// Formularz edycji pracownika
router.get(
  '/edit/:id',
  ...onlyEmployeeAdmins,
  employeesController.getEditEmployee
);

// Obsługa edycji (POST)
router.post(
  '/edit/:id',
  ...onlyEmployeeAdmins,
  employeesController.postEditEmployee
);

// Widok szczegółowy pracownika
router.get(
  '/:id',
  ...onlyEmployeeAdmins,
  employeesController.getEmployeeDetails
);

// Resetowanie hasła
router.post(
  '/:id/reset-password',
  ...onlyEmployeeAdmins,
  employeesController.resetPassword
);

// Podsumowanie resetu
router.get(
  '/:id/reset-summary',
  ...onlyEmployeeAdmins,
  employeesController.resetPasswordSummary
);

// Deaktywacja i aktywacja konta
router.post(
  '/:id/deactivate',
  ...onlyEmployeeAdmins,
  employeesController.deactivateEmployee
);

router.post(
  '/:id/activate',
  ...onlyEmployeeAdmins,
  employeesController.activateEmployee
);

// Podsumowanie deaktywacji (wyświetlenie kodu dostępowego)
router.get(
  '/:id/deactivation-summary',
  ...onlyEmployeeAdmins,
  employeesController.deactivationSummary
);

router.get(
  '/:id/deactivation-code',
  ...onlyEmployeeAdmins,
  employeesController.showDeactivationCode
);

router.post(
  '/:id/deactivation-code/reset',
  ...onlyEmployeeAdmins,
  employeesController.resetDeactivationCode
);

module.exports = router;
