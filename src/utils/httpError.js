function createHttpError(status, message, title = '') {
  const error = new Error(message);
  error.status = status;
  error.title = title;
  return error;
}

module.exports = createHttpError;
