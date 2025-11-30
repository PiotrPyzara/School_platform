const express = require('express');
const router = express.Router();

const isAuthController = require('../../middlewares/is_auth');
const setLocals = require('../../middlewares/setLocals');
const requireAuthz = require('../../middlewares/authz');

const facilitiesController = require('../../controllers/dashboard/facilitiesController');

// Dostęp mają tylko admin, headAdmin, director
const FACILITY_ROLES = ['admin', 'headAdmin', 'director'];
const onlyFacilityAdmins = [
  isAuthController,
  setLocals,
  requireAuthz({ anyRole: FACILITY_ROLES })
];

// Lista placówek
router.get(
  '/',
  ...onlyFacilityAdmins,
  facilitiesController.getFacilities
);

// Tworzenie nowej
router.get(
  '/create',
  ...onlyFacilityAdmins,
  facilitiesController.getCreate
);

router.post(
  '/create',
  ...onlyFacilityAdmins,
  facilitiesController.postCreate
);

// Edycja istniejącej
router.get(
  '/edit/:id',
  ...onlyFacilityAdmins,
  facilitiesController.getEdit
);

router.put(
  '/edit/:id',
  ...onlyFacilityAdmins,
  facilitiesController.postEdit
);

// Widok potwierdzenia usunięcia
router.get(
  '/delete/:id',
  ...onlyFacilityAdmins,
  facilitiesController.getDeleteConfirmation
);

// Właściwe usunięcie
router.delete(
  '/:id',
  ...onlyFacilityAdmins,
  facilitiesController.deleteFacility
);

module.exports = router;
