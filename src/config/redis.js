const Redis = require("ioredis");

const url = process.env.REDIS_URL;

// No REDIS_URL means the cache is disabled; the API keeps using PostgreSQL.
const redis = url
  ? new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false, // fail fast instead of queueing while Redis is down
      connectTimeout: 1000,
    })
  : null;

// A Redis outage must never crash the API.
if (redis) redis.on("error", (err) => console.warn(`Redis: ${err.message}`));

module.exports = redis;
