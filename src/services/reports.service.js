const prisma = require("../config/prisma");
const { getRanges } = require("../utils/dates");
const { toDb } = require("../utils/dbDate");
const readings = require("./readings.service");
const buildReportKey = require("../cache/buildReportKey");
const getCached = require("../cache/getCached");

const TTL_SECONDS = 300;

async function stats(userId, { from, to }) {
  const a = await prisma.reading.aggregate({
    where: { userId, date: { gte: toDb(from), lte: toDb(to) } },
    _count: { _all: true },
    _max: { value: true },
    _min: { value: true },
    _avg: { value: true },
  });
  return {
    from,
    to,
    count: a._count._all,
    highest: a._max.value,                         // null when empty
    lowest: a._min.value,
    average: a._avg.value === null ? null : Math.round(a._avg.value * 10) / 10,
  };
}

const daily = (uid, date) =>
  getCached(buildReportKey(uid, "daily", date), TTL_SECONDS, async () => ({
    ...(await stats(uid, getRanges(date).daily)),
    readings: await readings.listByDate(uid, date),
  }));

const monthToDate = (uid, date) =>
  getCached(buildReportKey(uid, "month-to-date", date), TTL_SECONDS, () =>
    stats(uid, getRanges(date).monthToDate)
  );

const monthly = (uid, date) =>
  getCached(buildReportKey(uid, "monthly", date), TTL_SECONDS, () =>
    stats(uid, getRanges(date).monthly)
  );

module.exports = { daily, monthToDate, monthly };