# Sistema de Oficina — Back-end (MVP)

Back-end do Sistema de Atendimento e Execução de Serviços de uma oficina mecânica,
construído com **Domain-Driven Design** num **monolito modular** (NestJS + Prisma + Postgres).

A linguagem ubíqua, o contrato de API e o modelo de dados estão em [`docs/`](docs/)
(`linguagem-ubiqua.md`, `contrato-api.md`, `schema.prisma`) e são a fonte de verdade do domínio.

## Stack

- **TypeScript + NestJS 10**
- **Postgres 16 + Prisma 5**
- **Jest** (cobertura mínima de 80% nos domínios críticos — `dominio/` e `aplicacao/`)
- **Swagger** (`@nestjs/swagger`) em `/api/docs`
- **JWT** (`@nestjs/jwt` + Passport) nas rotas administrativas
- **Docker** (`Dockerfile` + `docker-compose.yml`)

## Arquitetura — monolito modular

Um deploy, um banco, organizado em módulos por contexto delimitado. Cada módulo tem
quatro camadas internas:

```
src/
  compartilhado/      # shared kernel: Prisma, erros padronizados, (futuro) VOs e event bus
  identidade/         # autenticação JWT (transversal às rotas admin)
  clientes-veiculos/  # (Fase 3)
  ordem-servico/      # núcleo (Fase 3+)
  estoque/            # (Fase 4)
  catalogo-servicos/  # (Fase 8)
  notificacoes/       # (Fase 4)
```

Cada módulo de domínio tem: `dominio` (entidades, VOs, eventos, regras, portas),
`aplicacao` (casos de uso), `infraestrutura` (repositórios Prisma, adaptadores) e
`interfaces` (controllers REST, DTOs, Swagger).

**Regra de ouro:** um módulo nunca importa entidade ou repositório de outro —
a comunicação é por **porta** (interface) ou por **evento** (event bus in-process).

## Como rodar

### Opção 1 — Docker (app + Postgres com um comando)

```bash
docker compose up --build
```

Sobe o Postgres e a API. No start, o container sincroniza o schema (`prisma db push`),
roda o seed (cria o usuário administrativo) e inicia a API.

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs

### Opção 2 — Local (Node 18+)

```bash
cp .env.example .env          # ajuste DATABASE_URL e JWT_SECRET se quiser
npm install
npm run prisma:generate
npm run prisma:migrate        # ou: npx prisma db push
npm run seed
npm run start:dev
```

> Requer um Postgres acessível na `DATABASE_URL`. Para subir só o banco:
> `docker compose up db`.

## Autenticação

O seed cria um usuário administrativo:

| username | senha       | papel  |
|----------|-------------|--------|
| `gestor` | `gestor123` | GESTOR |

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{ "username": "gestor", "senha": "gestor123" }'
# → { "accessToken": "...", "expiresIn": 3600 }
```

Use o token nas rotas administrativas: `Authorization: Bearer <accessToken>`.

## Testes

```bash
npm test          # unitários (domínio + aplicação)
npm run test:cov  # com cobertura (threshold de 80%)
npm run test:e2e  # end-to-end (fluxo HTTP de autenticação)
```

## Padrão de erro

Todas as respostas de erro seguem o envelope do contrato:

```json
{ "erro": { "codigo": "NAO_AUTENTICADO", "mensagem": "Credenciais inválidas.", "detalhes": null } }
```

## Roadmap (fases)

1. ✅ **Esqueleto** — projeto, Prisma, Docker, Swagger, Jest e `identidade` (JWT).
2. Compartilhado — erros, classes-base de entidade/evento, VOs (CPF/CNPJ, Placa), event bus.
3. Abertura — `clientes-veiculos` + abrir OS.
4. Diagnóstico — registrar serviços/peças → verificar estoque → cotar → gerar orçamento.
5. Orçamento — enviar → resposta do cliente → reservar/encomendar por evento.
6. Execução — concluir → baixar estoque → registrar tempo; reparo adicional.
7. Entrega — marcar pago → entregar → encerrar.
8. CRUDs administrativos restantes + relatório de tempo médio.
9. Fechamento — cobertura de testes, Swagger, Docker, README, `npm audit`.
