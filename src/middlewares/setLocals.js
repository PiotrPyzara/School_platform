const Employee = require('../models/userModel');
const { roleLabels } = require('../utils/labels');
const { hasRole, hasAnyRole, hasPermission } = require('../utils/permissions');

module.exports = async (req, res, next) => {
  try {
    if (!req.session.user || !req.session.user._id) {
      res.locals.user = null;
      // Dodaj puste funkcje, żeby nie rzucało błędów w EJS
      res.locals.hasRole = () => false;
      res.locals.hasAnyRole = () => false;
      res.locals.hasPermission = () => false;
      return next();
    }

    // Pobierz aktualnego usera z bazy z placówkami
    const user = await Employee.findById(req.session.user._id)
      .populate('facilities.facilityId')
      .lean();

    if (!user) {
      res.locals.user = null;
      res.locals.hasRole = () => false;
      res.locals.hasAnyRole = () => false;
      res.locals.hasPermission = () => false;
      return next();
    }

    // Dodaj przetłumaczone role
    user.friendlyRoles = Array.isArray(user.roles)
      ? user.roles.map(role => roleLabels[role] || role)
      : [];

    res.locals.user = user;

    // Helpery do widoków!
    res.locals.hasRole = (role) => hasRole(user, role);
    res.locals.hasAnyRole = (rolesArr) => hasAnyRole(user, rolesArr);
    res.locals.hasPermission = (perm) => hasPermission(user, perm);

    next();

  } catch (err) {
    console.error('Błąd w middleware setUserLocals:', err);
    res.locals.user = null;
    res.locals.hasRole = () => false;
    res.locals.hasAnyRole = () => false;
    res.locals.hasPermission = () => false;
    next();
  }
};
