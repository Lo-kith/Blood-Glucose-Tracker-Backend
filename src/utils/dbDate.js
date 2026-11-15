const toDb = (str) => new Date(`${str}T00:00:00.000Z`);   // 'YYYY-MM-DD' -> Date
const toStr = (d) => d.toISOString().slice(0, 10);        // Date -> 'YYYY-MM-DD'
module.exports = { toDb, toStr };