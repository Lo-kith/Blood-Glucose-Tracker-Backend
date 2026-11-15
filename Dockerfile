# Debian slim, not Alpine: Prisma ships glibc builds of its query engine,
# and slim + openssl avoids the musl/OpenSSL problems seen on Alpine.
FROM node:20-slim

# Prisma's query engine loads libssl at runtime.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first so npm ci is cached until dependencies change.
COPY package*.json ./
# bcrypt 6 ships linux-x64 prebuilds, so no compiler is needed here.
# If a future dependency has no prebuild, add build-essential and python3.
RUN npm ci

# Generate the client after the schema exists, for the container's engine.
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 5000
CMD ["node", "src/server.js"]
