const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const isAuthController = require('../middlewares/is_auth');
const setLocals = require('../middlewares/setLocals');

// Wyświetlanie formularza logowania
router.get('/login', authController.getLogin);

// Obsługa logowania
router.post('/login', authController.postLogin);

// // Przykładowa trasa do dashboardu (w przypadku zalogowania)
// router.get('/dashboard',isAuthController,setLocals,(req, res) => {
//     res.render('dashboard',{currentView: 'dashboard'}); // Przykładowy login, można go zastąpić dynamicznie
// });

router.post('/logout', authController.postLogout);

module.exports = router;
