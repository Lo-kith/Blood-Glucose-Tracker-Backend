// Integration tests for the Redis report cache.
// REDIS_URL must point at a real Redis for these to run; otherwise they are skipped.
require("dotenv").config();

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawn } = require("node:child_process");
const jwt = require("jsonwebtoken");

const ROOT = path.join(__dirname, "..", "..");

if (!process.env.REDIS_URL || !process.env.JWT_SECRET) {
  test("Redis cache tests", { skip: "Set REDIS_URL (and JWT_SECRET) to run these tests." }, () => {});
  return;
}

const app = require("../app");
const prisma = require("../config/prisma");
const redis = require("../config/redis");
const buildReportKey = require("../cache/buildReportKey");
const clearUserReports = require("../cache/clearUserReports");

const DATE = "2024-03-10"; // a fixed past date, isolated test data
const PASSWORD = "Passw0rd123";

let server;
let base;
let userA;
let userB;

async function api(pathname, { method = "GET", token, body } = {}) {
  const res = await fetch(`${base}${pathname}`, {
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
  const email = `cache-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@sweety.app`;
  const reg = await api("/auth/register", {
    method: "POST",
    body: { name: "Cache Test", email, password: PASSWORD },
  });
  assert.equal(reg.status, 201);

  const login = await api("/auth/login", { method: "POST", body: { email, password: PASSWORD } });
  assert.equal(login.status, 200);
  return { id: login.body.user.id, token: login.body.token, email };
}

async function report(user) {
  return api(`/reports/daily?date=${DATE}`, { token: user.token });
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  userA = await signup();
  userB = await signup();
});

after(async () => {
  for (const user of [userA, userB]) {
    if (!user) continue;
    await clearUserReports(user.id);
    await prisma.user.deleteMany({ where: { id: user.id } }); // readings cascade
  }
  await prisma.$disconnect();
  if (redis) redis.disconnect();
  await new Promise((resolve) => server.close(resolve));
});

test("daily report is cached", async () => {
  const key = buildReportKey(userA.id, "daily", DATE);
  await redis.del(key);

  const first = await report(userA);
  assert.equal(first.status, 200);
  assert.equal(await redis.exists(key), 1, "report should be cached after the first call");

  const ttl = await redis.ttl(key);
  assert.ok(ttl > 0 && ttl <= 300, `ttl should be 300 or less, got ${ttl}`);

  const second = await report(userA);
  assert.deepEqual(second.body.report, first.body.report);
});

test("cache is cleared when a reading is added", async () => {
  const key = buildReportKey(userA.id, "daily", DATE);
  await report(userA); // cache the empty report
  assert.equal(await redis.exists(key), 1);

  const created = await api("/readings", {
    method: "POST",
    token: userA.token,
    body: { date: DATE, slot: "morning_fasting", value: 123 },
  });
  assert.equal(created.status, 201);
  assert.equal(await redis.exists(key), 0, "adding a reading must delete cached reports");

  const fresh = await report(userA);
  assert.equal(fresh.body.report.count, 1);
  assert.equal(fresh.body.report.highest, 123);
  assert.equal(fresh.body.report.readings.length, 1);
  assert.equal(fresh.body.report.readings[0].value, 123);
});

test("cache is cleared after edit and after delete", async () => {
  const key = buildReportKey(userA.id, "daily", DATE);

  const list = await api(`/readings?date=${DATE}`, { token: userA.token });
  const readingId = list.body.readings[0].id;

  await report(userA); // re-cache the current state
  assert.equal(await redis.exists(key), 1);

  const updated = await api(`/readings/${readingId}`, {
    method: "PUT",
    token: userA.token,
    body: { date: DATE, slot: "morning_fasting", value: 150 },
  });
  assert.equal(updated.status, 200);
  assert.equal(await redis.exists(key), 0, "editing a reading must delete cached reports");

  const afterUpdate = await report(userA);
  assert.equal(afterUpdate.body.report.highest, 150);

  const deleted = await api(`/readings/${readingId}`, { method: "DELETE", token: userA.token });
  assert.equal(deleted.status, 204);
  assert.equal(await redis.exists(key), 0, "deleting a reading must delete cached reports");

  const afterDelete = await report(userA);
  assert.equal(afterDelete.body.report.count, 0);
  assert.deepEqual(afterDelete.body.report.readings, []);
});

test("one user's reading change does not clear another user's cache", async () => {
  const keyA = buildReportKey(userA.id, "daily", DATE);
  const keyB = buildReportKey(userB.id, "daily", DATE);
  await clearUserReports(userA.id);
  await clearUserReports(userB.id);

  await api("/readings", {
    method: "POST",
    token: userA.token,
    body: { date: DATE, slot: "after_lunch", value: 140 },
  });

  await report(userA);
  await report(userB);
  assert.equal(await redis.exists(keyA), 1);
  assert.equal(await redis.exists(keyB), 1);

  await api("/readings", {
    method: "POST",
    token: userA.token,
    body: { date: DATE, slot: "after_dinner", value: 160 },
  });

  assert.equal(await redis.exists(keyA), 0, "user A's keys must be cleared by user A's write");
  assert.equal(await redis.exists(keyB), 1, "user B's keys must survive user A's write");
});

test("API still returns correct data when Redis is unreachable", async () => {
  const token = jwt.sign({ userId: userA.id }, process.env.JWT_SECRET, { expiresIn: "5m" });
  const childCode = `
    const app = require(${JSON.stringify(path.join(ROOT, "src", "app.js"))});
    const s = app.listen(0, () => console.log("PORT=" + s.address().port));
  `;

  const child = spawn(process.execPath, ["-e", childCode], {
    env: { ...process.env, REDIS_URL: "redis://127.0.0.1:6399" }, // nothing listening there
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", () => {});

  const port = await new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error("child server did not start")), 15000);
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      const match = buffer.match(/PORT=(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
  });

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/reports/daily?date=${DATE}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.report.count, 2);
    assert.equal(body.report.highest, 160);
    assert.deepEqual(
      body.report.readings.map((reading) => reading.value).sort((a, b) => a - b),
      [140, 160]
    );
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
  }
});
