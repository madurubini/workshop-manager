#!/bin/sh
set -e

echo "Sincronizando o schema com o banco (prisma db push)..."
npx prisma db push --skip-generate

echo "Rodando seed (idempotente)..."
node dist/prisma/seed.js

echo "Iniciando a API..."
exec node dist/main
