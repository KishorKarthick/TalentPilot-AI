// Rejects MongoDB operator injection: keys starting with '$' or containing '.'
// are stripped from request payloads before they reach any query builder.
const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Buffer.isBuffer(value);

const stripKeys = (value, depth = 0) => {
  if (depth > 10 || !isPlainObject(value)) return;

  if (Array.isArray(value)) {
    value.forEach((item) => stripKeys(item, depth + 1));
    return;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete value[key];
      continue;
    }
    stripKeys(value[key], depth + 1);
  }
};

const sanitizeRequest = (req, res, next) => {
  stripKeys(req.body);
  stripKeys(req.query);
  stripKeys(req.params);
  next();
};

module.exports = sanitizeRequest;
