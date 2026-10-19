// Small helpers so every list endpoint pages the same way.

// Reads ?page=1&limit=20 from the URL. Bad or missing values fall back to safe defaults,
// and limit is capped so nobody can ask for 1,000,000 rows at once.
exports.getPaging = (query, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

// What we send back so the client knows how many rows / pages exist in total.
exports.pageMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(Math.ceil(total / limit), 1)
});

// Stops characters like ( or * in a search box from being treated as regex commands.
exports.escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');