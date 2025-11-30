// utils/permissions.js

/**
 * Sprawdza, czy użytkownik ma daną rolę
 */
function hasRole(user, role) {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.includes(role);
}

/**
 * Sprawdza, czy użytkownik ma jakąkolwiek z podanych ról
 */
function hasAnyRole(user, rolesArr = []) {
  if (!user || !Array.isArray(user.roles)) return false;
  return rolesArr.some(r => user.roles.includes(r));
}

/**
 * Sprawdza, czy użytkownik ma konkretne uprawnienie (obsługuje wildcard)
 * Np. "facility:view:6857c19efa9423bf425b7e8c" lub "facility:view:*"
 */
function hasPermission(user, permission) {
  if (!user || !Array.isArray(user.permissions)) return false;
  if (user.permissions.includes(permission)) return true;

  // Obsługa wildcard (np. "facility:view:*")
  const parts = permission.split(':');
  for (let i = parts.length; i > 0; i--) {
    const wildcard = parts.slice(0, i).join(':') + ':*';
    if (user.permissions.includes(wildcard)) return true;
  }
  return false;
}

module.exports = {
  hasRole,
  hasAnyRole,
  hasPermission
};
