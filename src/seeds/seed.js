require("dotenv").config();
const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const { todayStr } = require("../utils/dates");
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

  // Build readings for the last 45 days (today included, never future)
  const today = new Date(`${todayStr()}T00:00:00Z`);
  const rows = [];

  for (let i = 0; i < 45; i++) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - i);

    SLOTS.forEach((slot) => {
      if (Math.random() < 0.2) return; // skip ~20% so some days have fewer than 4
      rows.push({
        userId: user.id,
        date: day,
        slot,
        value: 80 + Math.floor(Math.random() * 141), // 80 to 220
      });
    });
  }

  await prisma.reading.createMany({ data: rows, skipDuplicates: true });

  console.log(`Seeded ${rows.length} readings for ${email} / Demo@1234`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());