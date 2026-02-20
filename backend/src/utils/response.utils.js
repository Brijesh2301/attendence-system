const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const sendCreated = (res, data = null, message = 'Created successfully') =>
  sendSuccess(res, data, message, 201);

const sendError = (res, message = 'An error occurred', statusCode = 400, errors = null) => {
  const response = { success: false, message, timestamp: new Date().toISOString() };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const sendUnauthorized = (res, message = 'Unauthorized') => sendError(res, message, 401);
const sendForbidden   = (res, message = 'Forbidden')     => sendError(res, message, 403);
const sendNotFound    = (res, message = 'Not found')     => sendError(res, message, 404);
const sendServerError = (res, message = 'Internal server error') => sendError(res, message, 500);
const sendValidationError = (res, errors) => sendError(res, 'Validation failed', 422, errors);

module.exports = {
  sendSuccess, sendCreated, sendError,
  sendUnauthorized, sendForbidden, sendNotFound,
  sendServerError, sendValidationError,
};
