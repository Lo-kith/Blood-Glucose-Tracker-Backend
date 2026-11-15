// Integration tests for the main business rules.
require("dotenv").config();
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

if (!process.env.JWT_SECRET) {
  test("rules tests", { skip: "Set JWT_SECRET to run these tests." }, () => {});
  return;
}

const app = require("../app");
const prisma = require("../config/prisma");
const redis = require("../config/redis");
const clearUserReports = require("../cache/clearUserReports");

let server, base, a, b;

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function signup() {
  const email = `rules-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@sweety.app`;
  await api("/auth/register", { method: "POST", body: { name: "Rules Test", email, password: "Passw0rd123" } });
  const login = await api("/auth/login", { method: "POST", body: { email, password: "Passw0rd123" } });
  return { id: login.body.user.id, token: login.body.token };
}

const add = (user, date, slot, value) =>
  api("/readings", { method: "POST", token: user.token, body: { date, slot, value } });

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  a = await signup();
  b = await signup();
});

after(async () => {
  for (const u of [a, b]) {
    if (!u) continue;
    await clearUserReports(u.id);
    await prisma.user.deleteMany({ where: { id: u.id } });
  }
  await prisma.$disconnect();
  if (redis) redis.disconnect();
  await new Promise((r) => server.close(r));
});

test("empty value is rejected", async () => {
  const r = await add(a, "2024-05-09", "after_lunch", "");
  assert.equal(r.status, 400);
  assert.equal(r.body.error.message, "Please enter a glucose value.");
});

test("value outside 40-600 is rejected", async () => {
  const r = await add(a, "2024-05-09", "after_lunch", 700);
  assert.equal(r.status, 400);
  assert.equal(r.body.error.message, "Value must be between 40 and 600 mg/dl.");
});

test("future date is rejected", async () => {
  const r = await add(a, "2999-01-01", "after_lunch", 120);
  assert.equal(r.status, 400);
  assert.equal(r.body.error.message, "Date cannot be in the future.");
});

test("same slot twice on one day is rejected", async () => {
  await add(a, "2024-05-10", "morning_fasting", 100);
  const r = await add(a, "2024-05-10", "morning_fasting", 110);
  assert.equal(r.status, 409);
  assert.equal(r.body.error.message, "You already have an Morning (fasting) reading for this date.");
});

test("5th reading on one day is rejected", async () => {
  for (const slot of ["morning_fasting", "after_breakfast", "after_lunch", "after_dinner"]) {
    await add(a, "2024-05-11", slot, 120);
  }
  const r = await add(a, "2024-05-11", "after_lunch", 130);
  assert.equal(r.status, 400);
  assert.equal(r.body.error.message, "You can add only 4 readings per day.");
});

test("another user cannot delete my reading", async () => {
  const created = await add(a, "2024-05-12", "after_dinner", 140);
  const r = await api(`/readings/${created.body.reading.id}`, { method: "DELETE", token: b.token });
  assert.equal(r.status, 404);
});

test("report numbers are correct", async () => {
  await add(b, "2024-05-13", "morning_fasting", 100);
  await add(b, "2024-05-13", "after_lunch", 151);
  const r = await api("/reports/daily?date=2024-05-13", { token: b.token });
  assert.equal(r.body.report.count, 2);
  assert.equal(r.body.report.highest, 151);
  assert.equal(r.body.report.lowest, 100);
  assert.equal(r.body.report.average, 125.5);
});

test("empty period returns count 0 and null average", async () => {
  const r = await api("/reports/daily?date=2024-04-01", { token: b.token });
  assert.equal(r.body.report.count, 0);
  assert.equal(r.body.report.average, null);
});