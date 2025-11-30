const defaultIcons = {
  404: 'bi-search',
  403: 'bi-lock',
  401: 'bi-shield-lock',
  500: 'bi-bug',
  default: 'bi-exclamation-triangle'
};

function getDefaultTitle(statusCode) {
  switch (statusCode) {
    case 404:
      return 'Błąd 404 - Nie znaleziono';
    case 403:
      return 'Błąd 403 - Brak dostępu';
    case 401:
      return 'Błąd 401 - Nieautoryzowany dostęp';
    case 500:
    default:
      return 'Błąd 500 - Wewnętrzny błąd serwera';
  }
}

module.exports = (err, req, res, next) => {
  const statusCode = err.status || 500;

  if(statusCode === 500) {
    console.log(err);
    err.message = null;
  }

  res.status(statusCode).render('error', {
    errorCode: statusCode,
    errorIcon: err.icon || defaultIcons[statusCode] || defaultIcons.default,
    pageTitle: err.title || getDefaultTitle(statusCode),
    message: err.message || 'Wystąpił nieoczekiwany błąd.',
  });
};
