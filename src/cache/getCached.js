const redis = require("../config/redis");

// Read-through cache: any Redis problem falls back to the database.
async function getCached(key, ttlSeconds, fetchFn) {
  if (!redis) return fetchFn();

  try {
    const cached = await redis.get(key);
    if (cached !== null) return JSON.parse(cached);
  } catch (err) {
    console.warn(`Redis GET skipped: ${err.message}`);
  }

  const fresh = await fetchFn();
  // Fetch errors propagate and are never cached.
  try {
    await redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds);
  } catch (err) {
    console.warn(`Redis SET skipped: ${err.message}`);
  }

  return fresh;
}

module.exports = getCached;
