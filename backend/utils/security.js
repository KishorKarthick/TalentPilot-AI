const mongoose = require('mongoose');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isValidObjectId = (value) =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) && String(new mongoose.Types.ObjectId(value)) === value;

// Whitelist of client-settable fields, guarding against mass assignment.
const pick = (source, fields) =>
  fields.reduce((acc, field) => {
    if (source && Object.prototype.hasOwnProperty.call(source, field)) acc[field] = source[field];
    return acc;
  }, {});

const parsePagination = ({ page, limit }, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const parsedLimit = Math.min(maxLimit, Math.max(1, Number.parseInt(limit, 10) || defaultLimit));
  return { page: parsedPage, limit: parsedLimit, skip: (parsedPage - 1) * parsedLimit };
};

module.exports = { escapeRegex, escapeHtml, isValidObjectId, pick, parsePagination };
