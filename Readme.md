# Redis caching

The daily, month-to-date, and monthly report results are cached in Redis for 300 seconds.
Keys use the format `report:<userId>:<type>:<date>`, where `type` is `daily`,
`month-to-date`, or `monthly`. A user's report keys are cleared after that user's
reading is successfully created, updated, or deleted.

Run Redis locally:

```sh
docker run -d -p 6379:6379 redis:7-alpine
```

If Redis is down the app falls back to PostgreSQL.