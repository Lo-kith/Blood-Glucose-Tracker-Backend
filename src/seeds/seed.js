require("dotenv").config();
const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const redis = require("../config/redis");
const clearUserReports = require("../cache/clearUserReports");
const { todayStr, getRanges } = require("../utils/dates");
const { SLOTS } = require("../validators/reading.schema");

async function main() {
  const email = "demo@sweety.app";

  // Remove old demo user (readings are deleted too because of cascade)
  await prisma.user.deleteMany({ where: { email } });

  // Create demo user with hashed password
  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      email,
      password: await bcrypt.hash("Demo@1234", 12),
    },
  });

  // From the 1st of the previous month up to today (never a future date)
  const { from } = getRanges(todayStr()).monthly;
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${todayStr()}T00:00:00Z`);
  const rows = [];

  for (const day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    SLOTS.forEach((slot) => {
      if (Math.random() < 0.2) return; // skip ~20% so some days have fewer than 4
      rows.push({
        userId: user.id,
        date: new Date(day), // copy, because `day` keeps changing
        slot,
        value: 80 + Math.floor(Math.random() * 141), // 80 to 220
      });
    });
  }

  await prisma.reading.createMany({ data: rows, skipDuplicates: true });
  await clearUserReports(user.id); // so old cached reports are not shown

  console.log(`Seeded ${rows.length} readings for ${email} / Demo@1234`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (redis) redis.disconnect();
  });