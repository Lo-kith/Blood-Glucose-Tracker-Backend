const { z } = require("zod");
const { todayStr } = require("../utils/dates");

// Accepts only real calendar dates, e.g. rejects 2026-02-30.
const isRealDate = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.")
  .refine(isRealDate, "Invalid date.");

const rangeQuerySchema = z
  .object({
    from: dateField,
    to: dateField.refine((value) => value <= todayStr(), "Date cannot be in the future."),
  })
  .refine((value) => value.from <= value.to, {
    message: "Start date cannot be after end date.",
    path: ["from"],
  })
  .refine(
    (value) => {
      // 92 calendar days maximum, counted inclusively.
      const from = Date.parse(`${value.from}T00:00:00Z`);
      const to = Date.parse(`${value.to}T00:00:00Z`);

      return (to - from) / 86_400_000 + 1 <= 92;
    },
    { message: "Date range is too long.", path: ["to"] },
  );

module.exports = { rangeQuerySchema };
