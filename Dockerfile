# ─────────────── Estágio 1: build ───────────────
FROM node:20-slim AS builder

# openssl é exigido pelo engine do Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build
# Compila o seed (fora do build do Nest) para rodar no container sem ts-node
RUN npx tsc prisma/seed.ts --outDir dist/prisma --module commonjs \
    --target ES2021 --esModuleInterop --skipLibCheck --resolveJsonModule

# ─────────────── Estágio 2: runtime ───────────────
FROM node:20-slim AS runner

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
# Cliente Prisma já gerado (a CLI prisma vem como dependência de produção)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
