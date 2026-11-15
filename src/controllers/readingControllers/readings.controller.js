const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");
const { readingSchema } = require("../../validators/reading.schema");
const { dateQuerySchema } = require("../../validators/query.schema");
const service = require("../../services/readings.service");

const parseId = (raw) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, "Invalid reading id.");
  return id;
};

exports.list = asyncHandler(async (req, res) => {
  const { date } = dateQuerySchema.parse(req.query);       // ZodError -> errorHandler
  res.json({ readings: await service.listByDate(req.userId, date) });
});

exports.create = asyncHandler(async (req, res) => {
  const data = readingSchema.parse(req.body);
  res.status(201).json({ reading: await service.create(req.userId, data) });
});

exports.update = asyncHandler(async (req, res) => {
  const data = readingSchema.parse(req.body);
  res.json({ reading: await service.update(req.userId, parseId(req.params.id), data) });
});

exports.remove = asyncHandler(async (req, res) => {
  await service.remove(req.userId, parseId(req.params.id));
  res.status(204).send();
});