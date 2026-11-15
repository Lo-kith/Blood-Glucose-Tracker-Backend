const redis = require("../config/redis");

const BATCH = 100;

// SCAN (never KEYS) so a big keyspace does not block Redis.
async function clearUserReports(userId) {
  if (!redis) return;

  const pattern = `report:${userId}:*`;

  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", BATCH);
      cursor = next;
      for (let i = 0; i < keys.length; i += BATCH) {
        await redis.del(...keys.slice(i, i + BATCH));
      }
    } while (cursor !== "0");
  } catch (err) {
    console.warn(`Redis clear skipped: ${err.message}`);
  }
}

module.exports = clearUserReports;
