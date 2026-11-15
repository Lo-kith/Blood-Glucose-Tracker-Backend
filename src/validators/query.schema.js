const { z } = require("zod");
const { todayStr } = require("../utils/dates");

const isRealDate = (s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
};

const dateQuerySchema = z.object({
  date: z
    .string({ required_error: "Please select a date." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.")
    .refine(isRealDate, "Invalid date.")
    .refine((d) => d <= todayStr(), "Date cannot be in the future."),
});

module.exports = { dateQuerySchema };