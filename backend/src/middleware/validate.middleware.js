const { validationResult } = require('express-validator');
const { sendValidationError } = require('../utils/response.utils');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
      value: e.value,
    }));
    return sendValidationError(res, formatted);
  }
  next();
};

module.exports = { validate };
