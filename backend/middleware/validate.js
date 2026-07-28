const { validationResult } = require('express-validator');

// Runs after express-validator checks and short-circuits on validation errors.
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

module.exports = { handleValidation };
