// Keys include the user id so one user's writes clear only their reports.
function buildReportKey(userId, type, date) {
  return `report:${userId}:${type}:${date}`;
}

module.exports = buildReportKey;
