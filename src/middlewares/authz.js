// middlewares/authz.js

const { hasRole, hasAnyRole, hasPermission } = require('../utils/permissions');

/**
 * Middleware autoryzacyjny.
 * Użycie: requireAuthz({ role: 'admin' }), requireAuthz({ anyRole: [...] }), requireAuthz({ permission: '...' })
 */
function requireAuthz(options = {}) {
  return (req, res, next) => {
    const user = res.locals.user;

    if (!user) {
      // Niezalogowany
      return res.status(401).render('error', {
        errorCode: 401,
        errorIcon: 'bi-person-x',
        pageTitle: 'Brak dostępu',
        message: 'Musisz być zalogowany, aby zobaczyć tę stronę.',
        buttonText: 'Powrót do logowania',
        buttonLink: '/login'
      });
    }

    // Brak wymaganych uprawnień
    if (
      (options.role && !hasRole(user, options.role)) ||
      (options.anyRole && !hasAnyRole(user, options.anyRole)) ||
      (options.permission && !hasPermission(user, options.permission))
    ) {
      return res.status(403).render('error', {
        errorCode: 403,
        errorIcon: 'bi-shield-lock',
        pageTitle: 'Brak dostępu',
        message: 'Nie masz uprawnień do wyświetlenia tej strony lub wykonania tej operacji.',
        errorButtonText: 'Powrót',
        errorButtonLink: '/'
      });
    }

    next();
  };
}

module.exports = requireAuthz;
