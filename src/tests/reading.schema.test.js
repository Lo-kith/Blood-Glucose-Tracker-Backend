const { readingSchema } = require("../validators/reading.schema");

const msg = (input) => {
  const r = readingSchema.safeParse(input);
  return r.success ? null : r.error.issues[0].message;
};
const ok = { date: "2026-01-01", slot: "after_lunch", value: 120 };

test("valid", () => expect(msg(ok)).toBeNull());
test("empty value", () => expect(msg({ ...ok, value: "" })).toBe("Please enter a glucose value."));
test("39", () => expect(msg({ ...ok, value: 39 })).toBe("Value must be between 40 and 600 mg/dl."));
test("601", () => expect(msg({ ...ok, value: 601 })).toBe("Value must be between 40 and 600 mg/dl."));
test("decimal", () => expect(msg({ ...ok, value: 100.5 })).toBe("Value must be between 40 and 600 mg/dl."));
test("future date", () => expect(msg({ ...ok, date: "2999-01-01" })).toBe("Date cannot be in the future."));