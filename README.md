# Sistema de Oficina — Back-end (MVP)

Back-end do Sistema de Atendimento e Execução de Serviços de uma oficina mecânica:
cadastro de clientes/veículos, **Ordem de Serviço** (diagnóstico → orçamento → execução →
entrega), controle de **estoque de peças** e acompanhamento do cliente por link público.

**Stack:** TypeScript · NestJS 11 · PostgreSQL 16 + Prisma 5 · JWT · Swagger · Docker.
Banco **PostgreSQL** (justificativa na ADR [`docs/adr/0001-escolha-do-banco-de-dados.md`](docs/adr/0001-escolha-do-banco-de-dados.md)).

---

## Pré-requisitos

- **Opção Docker (recomendada):** apenas **Docker** instalado — não precisa de Node nem Postgres na máquina.
- **Opção local:** **Node 20** (o `package.json` exige `engines.node >= 20`) e um Postgres acessível.

---

## Como executar

### Opção 1 — Docker (app + Postgres com um comando)

```bash
docker compose up --build
```

No start, o container aplica as migrations versionadas (`prisma migrate deploy`), roda o seed
(usuário + dados de exemplo) e sobe a API. Quando aparecer `Nest application successfully
started`, está pronto:

- **API:** http://localhost:3000/api/v1
- **Swagger:** http://localhost:3000/api/docs
- **Health check:** http://localhost:3000/api/v1/health → `{"status":"ok"}`
- **Postgres** exposto no host em **5433** (para não colidir com um Postgres já na 5432).

Em segundo plano: `docker compose up --build -d`. Para encerrar: `docker compose down`
(ou `down -v` para apagar também o volume do banco).

> Migrando de uma versão que usava `prisma db push`? Rode `docker compose down -v` uma vez para
> recriar o volume do banco limpo (o `migrate deploy` espera aplicar do zero).


## Autenticação

O seed cria um usuário administrativo e dados de exemplo (2 serviços, 2 peças — uma em estoque
e uma em falta, para exercitar a cotação):

| username | senha       | papel  |
|----------|-------------|--------|
| `gestor` | `gestor123` | GESTOR |

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{ "username": "gestor", "senha": "gestor123" }'
# → { "accessToken": "...", "expiresIn": 3600 }
```

Use o token nas rotas administrativas: `Authorization: Bearer <accessToken>`. Novos usuários são
criados por um GESTOR via `POST /usuarios` (`{ username, senha, papel }`).

---

## Endpoints principais

Base `/api/v1`. A referência completa (schemas e exemplos) está no **Swagger** em `/api/docs`.

- **Auth:** `POST /auth/login` · **Usuários (GESTOR):** `POST /usuarios`
- **CRUD (JWT):** `/clientes`, `/clientes/{id}/veiculos`, `/veiculos/{id}`, `/servicos`, `/pecas`,
  `PATCH /pecas/{id}/estoque`
- **Ordem de Serviço (JWT):** `POST /ordens-servico`, `GET /ordens-servico[/{id}]`,
  `POST .../diagnostico`, `POST .../orcamento/enviar`, `POST .../execucao/concluir`,
  `POST .../orcamentos-adicionais`, `POST .../pagamento`, `POST .../entrega`,
  `GET /relatorios/tempo-medio-execucao`
- **Acompanhamento (público, token da OS):** `GET /acompanhamento/{osId}`,
  `POST .../orcamentos/{orcamentoId}/resposta`
- **Infra (público):** `GET /health`

**Padrão de erro:**

```json
{ "erro": { "codigo": "NAO_AUTENTICADO", "mensagem": "Credenciais inválidas.", "detalhes": null } }
```

Status: 400 (validação), 401/403 (auth), 404, 409 (conflito), 422 (transição de status inválida).

---

## Testes

```bash
npm test          # unitários (domínio + aplicação) — 189 testes
npm run test:cov  # com cobertura (threshold GLOBAL de 80%)
npm run test:e2e  # end-to-end (auth, health e fluxo completo da OS via HTTP)
```

Os testes de domínio rodam **sem banco nem HTTP** (mockam portas/repositórios). O `test:e2e`
exige um Postgres acessível e usa um banco dedicado (`oficina_e2e`).

---

## Arquitetura (resumo)

Monolito modular em **DDD** (NestJS + Prisma): um deploy, um banco, organizado por **contexto
delimitado** em `src/` (`identidade`, `clientes-veiculos`, `catalogo-servicos`, `estoque`,
`ordem-servico`, `notificacoes`, `compartilhado`). Cada módulo tem as camadas `dominio`,
`aplicacao`, `infraestrutura` e `interfaces`. Detalhes do domínio e do contrato em `docs/`.
