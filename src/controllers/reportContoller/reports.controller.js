const asyncHandler = require("../../utils/asyncHandler");
const { dateQuerySchema } = require("../../validators/query.schema");
const service = require("../../services/reports.service");

const make = (fn) =>
  asyncHandler(async (req, res) => {
    const { date } = dateQuerySchema.parse(req.query);
    res.json({ report: await fn(req.userId, date) });
  });

exports.daily = make(service.daily);
exports.monthToDate = make(service.monthToDate);
exports.monthly = make(service.monthly);