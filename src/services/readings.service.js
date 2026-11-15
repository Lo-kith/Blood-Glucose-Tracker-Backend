const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");
const { toDb, toStr } = require("../utils/dbDate");
const { SLOTS, SLOT_LABELS } = require("../validators/reading.schema");

const shape = (r) => ({ id: r.id, date: toStr(r.date), slot: r.slot, value: r.value });
const dupMsg = (slot) => `You already have an ${SLOT_LABELS[slot]} reading for this date.`;

// Order matters: check the 4-per-day limit BEFORE the duplicate slot
async function assertCanSave(userId, { date, slot }, excludeId) {
  const others = excludeId ? { id: { not: excludeId } } : {};

  const count = await prisma.reading.count({
    where: { userId, date: toDb(date), ...others },
  });
  if (count >= 4) throw new AppError(400, "You can add only 4 readings per day.", "date");

  const dup = await prisma.reading.findFirst({
    where: { userId, date: toDb(date), slot, ...others },
  });
  if (dup) throw new AppError(409, dupMsg(slot), "slot");
}

async function create(userId, data) {
  await assertCanSave(userId, data);
  try {
    const r = await prisma.reading.create({
      data: { userId, date: toDb(data.date), slot: data.slot, value: data.value },
    });
    return shape(r);
  } catch (e) {
    if (e.code === "P2002") throw new AppError(409, dupMsg(data.slot), "slot"); // race condition
    throw e;
  }
}

async function update(userId, id, data) {
  const existing = await prisma.reading.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "Reading not found.");
  await assertCanSave(userId, data, id);
  const r = await prisma.reading.update({
    where: { id },
    data: { date: toDb(data.date), slot: data.slot, value: data.value },
  });
  return shape(r);
}

async function remove(userId, id) {
  const { count } = await prisma.reading.deleteMany({ where: { id, userId } });
  if (!count) throw new AppError(404, "Reading not found.");
}

async function listByDate(userId, date) {
  const rows = await prisma.reading.findMany({ where: { userId, date: toDb(date) } });
  return rows.map(shape).sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
}

module.exports = { create, update, remove, listByDate };