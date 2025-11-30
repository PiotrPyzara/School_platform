const User = require('../models/userModel');

module.exports = async (req, res, next) => {
  if (!req.session.user || !req.session.user._id) {
    return res.redirect('/login');
  }

  try {
    const fullUser = await User.findById(req.session.user._id)
      .populate('facilities.facilityId')
      .lean();

    if (!fullUser) {
      return res.redirect('/login');
    }

    // Uzupełniamy dane do szablonów
    res.locals.user = fullUser;
    res.locals.user.friendlyRoles = req.session.user.friendlyRoles || [];

    next();
  } catch (err) {
    console.error('Błąd w middleware uwierzytelniającym:', err);
    res.status(500).render('error', { message: 'Wystąpił błąd podczas uwierzytelniania.' });
  }
};
