// Shared pagination helpers for list endpoints.

const getPagination = (query = {}, defaultLimit = 10) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
};

const paginationMeta = (total, limit) => ({
  total,
  pages: Math.ceil(total / limit),
});

module.exports = { getPagination, paginationMeta };
