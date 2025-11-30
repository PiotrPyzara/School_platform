const express = require('express');
const router = express.Router();

const isAuthController = require('../../middlewares/is_auth');
const setLocals = require('../../middlewares/setLocals');

const dashboardController = require('../../controllers/dashboard/indexController');

router.get('/', isAuthController , setLocals ,dashboardController.getDashboard);

module.exports = router;
