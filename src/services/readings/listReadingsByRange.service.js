const prisma = require("../../config/prisma");
const { toDb, toStr } = require("../../utils/dbDate");
const { SLOTS } = require("../../validators/reading.schema");

const shape = (reading) => ({
  id: reading.id,
  date: toStr(reading.date),
  slot: reading.slot,
  value: reading.value,
});

// Readings for one user between two dates, ordered by date then slot.
async function listReadingsByRange(userId, from, to) {
  const rows = await prisma.reading.findMany({
    where: {
      userId,
      date: { gte: toDb(from), lte: toDb(to) },
    },
  });

  return rows
    .map(shape)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot),
    );
}

module.exports = listReadingsByRange;
