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
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
# Cliente Prisma já gerado (a CLI prisma vem como dependência de produção)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# A imagem node:20-slim já traz o usuário sem privilégios "node". O processo roda
# como ele; node_modules continua pertencendo ao root, então a aplicação não
# consegue reescrever as próprias dependências em tempo de execução.
USER node

EXPOSE 3000

# A imagem só inicia a API. Migrar o banco é responsabilidade de quem orquestra:
# no Compose, do docker-entrypoint.sh; no Kubernetes, do Job de migrations
# (várias réplicas subindo juntas não podem migrar o banco ao mesmo tempo).
CMD ["node", "dist/main"]
