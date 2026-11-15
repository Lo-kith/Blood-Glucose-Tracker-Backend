const { getRanges } = require("../src/utils/dates");

test("monthly = previous month", () => {
  expect(getRanges("2026-10-15").monthly).toEqual({ from: "2026-09-01", to: "2026-09-30" });
});
test("January rolls back to December", () => {
  expect(getRanges("2026-01-10").monthly).toEqual({ from: "2025-12-01", to: "2025-12-31" });
});
test("leap year February", () => {
  expect(getRanges("2024-03-05").monthly.to).toBe("2024-02-29");
});
test("month-to-date", () => {
  expect(getRanges("2026-10-15").monthToDate).toEqual({ from: "2026-10-01", to: "2026-10-15" });
});