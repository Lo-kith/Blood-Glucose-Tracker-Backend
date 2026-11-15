# Sweety Backend

Express REST API for the Sweety blood glucose tracker. It uses Prisma with PostgreSQL for
persistent data, JWT for authentication, Zod for request validation, and optional Redis caching
for reports.

## Architecture

```text
HTTP request
  -> Express app and routes
  -> authentication middleware (protected routes)
  -> controllers and Zod validators
  -> services
  -> Prisma -> PostgreSQL

Report services -> Redis cache (300-second TTL)
                 -> PostgreSQL on cache miss or Redis error
```

Reading create, update, and delete operations clear that user's cached report keys after the
database write succeeds. Readings lists and chart-range results are not cached.

## Folder structure

```text
Sweety backend/
├── prisma/
│   ├── migrations/                 Database migration history
│   └── schema.prisma               User, Reading, and Slot models
├── src/
│   ├── cache/                      Report cache keys, reads, and invalidation
│   ├── config/                     Prisma and Redis clients
│   ├── controllers/                HTTP handlers
│   ├── middleware/                 JWT authentication and error handling
│   ├── routes/                     Auth, reading, and report routes
│   ├── seeds/                      Demo account and sample readings
│   ├── services/                   Database and report logic
│   ├── tests/                      API, date, and validation tests
│   ├── utils/                      Errors, dates, and async helpers
│   ├── validators/                 Zod request schemas
│   ├── app.js                      Express app and middleware setup
│   └── server.js                   Loads environment and starts the server
├── .env.example                    Local environment template
├── Dockerfile
└── package.json
```

## Requirements

- Node.js 20 or newer
- PostgreSQL 16 (or a compatible PostgreSQL version)
- Redis 7 is optional; the API uses PostgreSQL when Redis is unavailable

## Local setup

Run these commands from the backend directory:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env`: set `DATABASE_URL` to your PostgreSQL credentials and choose a private
`JWT_SECRET`. Leave `REDIS_URL` unset to disable caching, or use `redis://localhost:6379`.
For example, start local PostgreSQL and Redis with Docker:

```powershell
docker run --name sweety-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sweety_db -p 5432:5432 -d postgres:16-alpine
docker run --name sweety-redis -p 6379:6379 -d redis:7-alpine
```

Then generate Prisma Client, apply migrations, seed sample data, and start the API:

```powershell
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

The API listens at `http://localhost:5000`; its health check is
`http://localhost:5000/api/health`.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | API port; defaults to `5000` |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign and verify login tokens |
| `REDIS_URL` | Optional Redis URL; unset disables caching |
| `NODE_ENV` | Runtime environment |

## API URLs

Base URL: `http://localhost:5000/api`

| Method | URL | Purpose | Authentication |
| --- | --- | --- | --- |
| `GET` | `/health` | API health check | No |
| `POST` | `/auth/register` | Register with `{ "name", "email", "password" }` | No |
| `POST` | `/auth/login` | Log in and receive a JWT | No |
| `GET` | `/auth/me` | Get the current user's profile | Bearer token |
| `GET` | `/readings?date=YYYY-MM-DD` | List readings for a date | Bearer token |
| `GET` | `/readings/range?from=YYYY-MM-DD&to=YYYY-MM-DD` | List readings for a range (up to 92 days) | Bearer token |
| `POST` | `/readings` | Create a reading | Bearer token |
| `PUT` | `/readings/:id` | Update a reading | Bearer token |
| `DELETE` | `/readings/:id` | Delete a reading | Bearer token |
| `GET` | `/reports/daily?date=YYYY-MM-DD` | Daily report and readings | Bearer token |
| `GET` | `/reports/month-to-date?date=YYYY-MM-DD` | Month-to-date report | Bearer token |
| `GET` | `/reports/monthly?date=YYYY-MM-DD` | Previous calendar month report | Bearer token |

Send the login token on protected endpoints as `Authorization: Bearer <token>`. Reading dates
must not be in the future; values are integers from 40 to 600 mg/dL, with one reading per slot
and at most four readings per date. Valid slots are `morning_fasting`, `after_breakfast`,
`after_lunch`, and `after_dinner`.

Example PowerShell login and profile request:

```powershell
$login = Invoke-RestMethod -Method Post `
  -Uri "http://localhost:5000/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"demo@sweety.app","password":"Demo@1234"}'

$token = $login.token
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" `
  -Headers @{ Authorization = "Bearer $token" }
```

## Demo seed data

Run `npm run seed` after migrations. The seed deletes and recreates the demo account, then
generates readings from the 1st of the previous calendar month through today (inclusive). It
randomly skips about 20% of daily slots; generated values are 80-220 mg/dL.

Demo login: `demo@sweety.app` / `Demo@1234`

## Docker Compose

The Compose file is one directory above this backend, at `D:\builds\Sweety\docker-compose.yml`.
Run Compose commands from that project root:

```powershell
cd "D:\builds\Sweety"
docker compose up --build -d
docker compose ps
docker compose logs -f server
docker compose exec server npm run seed
```

Compose starts PostgreSQL (`db`), Redis, the API (`server`), and the frontend (`client`). The
server waits for database and Redis health checks, applies Prisma migrations, then starts.
Default URLs are:

- API: `http://localhost:5000/api`
- API health: `http://localhost:5000/api/health`
- Frontend: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Stop the services while keeping database data:

```powershell
docker compose down
```

To also delete the PostgreSQL data volume (destructive):

```powershell
docker compose down -v
```

## Redis report caching

Daily, month-to-date, and monthly reports use keys in the format
`report:<userId>:<type>:<date>` and a 300-second TTL. Successful reading create, update, or
delete operations clear all report keys for that user using Redis `SCAN` and batched `DEL`.
If Redis is down, the API falls back to PostgreSQL.

## Scripts and tests

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with Nodemon |
| `npm start` | Start the API |
| `npm run seed` | Recreate the demo user and seed readings |

`npm test` is currently a placeholder script and is not configured to run the test files.
