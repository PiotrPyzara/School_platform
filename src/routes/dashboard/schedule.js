const express = require('express');
const router = express.Router();

const isAuthController = require('../../middlewares/is_auth');
const setLocals = require('../../middlewares/setLocals');
const requireAuthz = require('../../middlewares/authz');
const scheduleController = require('../../controllers/dashboard/scheduleController');
const is_auth = require('../../middlewares/is_auth');

// Role z uprawnieniami do zarządzania grafikami
const SCHEDULE_ROLES = ['admin', 'headAdmin', 'director'];
const onlyScheduleAdmins = [
  isAuthController,
  setLocals,
  requireAuthz({ anyRole: SCHEDULE_ROLES })
];

// --- Własny grafik (widok nauczyciela) ---
router.get('/', isAuthController, setLocals, scheduleController.getSchedule);

// --- Edycja grafiku nauczyciela ---
router.get('/edit/:teacherId', ...onlyScheduleAdmins, scheduleController.getEditTeacherSchedule);

// --- Zapis grafiku nauczyciela ---
router.post('/update', ...onlyScheduleAdmins, scheduleController.postUpdateTeacherSchedule);

// --- Wydruk zbiorczy ---
router.get('/print', isAuthController,
  setLocals, scheduleController.getPrintableSchedule);

// --- Wydruk dla pojedynczego nauczyciela ---
router.get('/print/:teacherId', isAuthController,
  setLocals, scheduleController.getSingleTeacherPrintableSchedule);

module.exports = router;
