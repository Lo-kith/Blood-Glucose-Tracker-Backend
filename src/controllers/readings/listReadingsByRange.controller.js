const asyncHandler = require("../../utils/asyncHandler");
const { rangeQuerySchema } = require("../../validators/rangeQuery.schema");
const listReadingsByRange = require("../../services/readings/listReadingsByRange.service");

const listReadingsByRangeController = asyncHandler(async (req, res) => {
  const { from, to } = rangeQuerySchema.parse(req.query);

  res.json({ readings: await listReadingsByRange(req.userId, from, to) });
});

module.exports = listReadingsByRangeController;
