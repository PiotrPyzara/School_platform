const Employee = require('../../models/userModel');

exports.getDashboard = async (req, res) => {
  try {
    // Upewniamy się, że użytkownik jest zalogowany
    if (!req.session.user || !req.session.user._id) {
      return res.redirect('/login');
    }

    // Pobieramy pełne dane użytkownika wraz z placówkami
    const user = await Employee.findById(req.session.user._id)
      .populate('facilities.facilityId')
      .lean();

    if (!user) {
      return res.status(404).send('error', { message: 'Nie znaleziono użytkownika' });
    }

    res.render('dashboard/index', {
      pageTitle: 'Organizacja - Strona główna',
      currentView: 'dashboard',
    });
  } catch (err) {
    console.error('Błąd w getDashboard:', err);
    res.status(500).render('error', { message: 'Wystąpił błąd serwera' });
  }
};
