# Sistema de Oficina — Back-end (MVP)

Back-end do Sistema de Atendimento e Execução de Serviços de uma oficina mecânica,
construído com **Domain-Driven Design** num **monolito modular** (NestJS + Prisma + Postgres).

A linguagem ubíqua, o contrato de API e o modelo de dados estão em [`docs/`](docs/)
(`linguagem-ubiqua.md`, `contrato-api.md`, `schema.prisma`) — a fonte de verdade do domínio.
Há ainda uma [nota de segurança do `npm audit`](docs/seguranca-npm-audit.md).

## Stack

- **TypeScript + NestJS 10**
- **Postgres 16 + Prisma 5**
- **Jest** — 160 testes; cobertura ≥ 80% nos domínios críticos (`dominio/` + `aplicacao/`)
- **Swagger** (`@nestjs/swagger`) em `/api/docs`
- **JWT** (`@nestjs/jwt` + Passport) nas rotas administrativas
- **@nestjs/event-emitter** — event bus in-process · **@nestjs/schedule** — reenvio periódico
- **Docker** (`Dockerfile` multi-stage + `docker-compose.yml`)

## Por que Postgres? (justificativa do banco)

Banco **relacional** porque o domínio é cheio de **integridade referencial** (OS → cliente/veículo, orçamento → linhas, reserva → peça) e de **invariantes que exigem transação** — em especial a **reserva de estoque**, que precisa checar o disponível e gravar a reserva de forma **atômica** (um `UPDATE` condicional dentro de uma transação) para não permitir dupla reserva sob concorrência. Um banco de documentos tornaria essas garantias responsabilidade da aplicação.

Dentro dos relacionais, **PostgreSQL** por: suporte ACID maduro, tipo `Decimal` nativo (preços sem erro de ponto flutuante), bom desempenho com índices nas FKs e no `status` da OS, e ótima integração com o **Prisma**. É open-source e roda igual em dev (Docker) e produção.

## Arquitetura — monolito modular

Um deploy, um banco, organizado em módulos por **contexto delimitado**. Cada módulo de
domínio tem quatro camadas internas: `dominio` (entidades, value objects, eventos, regras,
portas), `aplicacao` (casos de uso), `infraestrutura` (repositórios Prisma, adaptadores) e
`interfaces` (controllers REST, DTOs, Swagger).

```
src/
  compartilhado/      # shared kernel: Prisma, erros padronizados, classes-base, VOs, event bus
  identidade/         # autenticação JWT (transversal às rotas admin)
  clientes-veiculos/  # cadastro + validações de CPF/CNPJ e placa
  catalogo-servicos/  # CRUD de serviços
  estoque/            # raiz Peça: verificar, reservar, encomendar, baixar
  ordem-servico/      # núcleo: OS, diagnóstico e orçamento; ciclo de vida
  notificacoes/       # adapta o serviço externo de avisos ao cliente
```

**Regra de ouro:** um módulo nunca importa entidade ou repositório de outro. A comunicação
acontece de duas formas:

- **Porta pública (interface)** quando precisa de resposta síncrona e consistente — ex.: ao
  abrir uma OS, o núcleo consulta `CLIENTES_VEICULOS_API`; no diagnóstico, consulta
  `CATALOGO_SERVICOS_API` e `ESTOQUE_API`. Cada módulo exporta só a porta, nunca seus internos.
- **Evento (event bus in-process)** quando é efeito posterior — ex.: ao aprovar o orçamento,
  o núcleo publica `OrcamentoAprovado`; o `estoque` reage **reservando** e o `notificacoes`
  reage **avisando** o cliente, sem um conhecer o outro (fan-out).

## Domínio em uma olhada

- **Clientes e Veículos** — CPF/CNPJ e placa validados (value objects) e únicos; veículo
  pertence a um cliente; soft delete (`ativo`).
- **Ordem de Serviço** (núcleo) — máquina de estados
  `Recebida → Em diagnóstico → Aguardando aprovação → Em execução → Finalizada → Entregue`
  (ou `Cancelada`); transições inválidas → **HTTP 422**. Uma OS tem **vários orçamentos**: um
  `INICIAL` (do diagnóstico) e zero ou mais `ADICIONAL` (reparos descobertos na execução). Cada
  orçamento é aprovado/recusado por id; a OS só finaliza quando nenhum está pendente. As linhas
  orçadas (`ServicoOrcado`/`PecaOrcada`) **congelam o preço**. Optimistic lock (`versao`).
- **Estoque** (raiz Peça) — `disponivel = saldoFisico − reservado`; nunca reserva acima do
  disponível. Verificar no diagnóstico é **só leitura**; reserva só após o orçamento aprovado;
  baixa só na conclusão da execução.

## Como rodar

### Opção 1 — Docker (app + Postgres com um comando)

```bash
docker compose up --build
```

No start, o container aplica as **migrations versionadas** (`prisma migrate deploy`), roda o seed e sobe a API.

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- Postgres exposto no host em **5433** (para não colidir com um Postgres já na 5432).

> Migrando de uma versão que usava `prisma db push`? Rode `docker compose down -v` uma vez para recriar o volume do banco limpo (o `migrate deploy` espera aplicar do zero).

### Opção 2 — Local (Node 18+)

```bash
cp .env.example .env          # ajuste DATABASE_URL e JWT_SECRET se quiser
npm install
npm run prisma:generate
npm run prisma:deploy         # aplica as migrations (prisma migrate deploy)
npm run seed
npm run start:dev
```

> O schema é versionado em `prisma/migrations/`. Para criar uma **nova** migration ao mudar o `schema.prisma`: `npm run prisma:migrate` (gera o arquivo SQL e aplica em dev).

> Requer um Postgres acessível na `DATABASE_URL`. Para subir só o banco:
> `docker compose up db` (fica em `localhost:5433`).

## Autenticação

O seed cria um usuário administrativo e dados de exemplo (2 serviços, 2 peças — uma em
estoque e uma em falta, para exercitar a cotação):

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

Novos usuários são criados por um GESTOR via `POST /usuarios` (`{ username, senha, papel }`,
papel ∈ `RECEPCIONISTA | MECANICO | GESTOR`). A senha nunca volta na resposta — só o hash é gravado.

## API (resumo)

Base `/api/v1`. Detalhes e schemas no Swagger.

**Auth:** `POST /auth/login` · **Usuários (JWT, GESTOR):** `POST /usuarios`

**CRUD administrativo (JWT):**
- `/clientes` (POST, GET, GET/{id}, PUT/{id}, DELETE/{id})
- `/clientes/{clienteId}/veiculos` (POST, GET) · `/veiculos/{id}` (GET, PUT, DELETE)
- `/servicos` (CRUD) · `/pecas` (CRUD) · `PATCH /pecas/{id}/estoque` (ajuste manual)

**Ordem de Serviço (JWT):**
- `POST /ordens-servico` · `GET /ordens-servico` · `GET /ordens-servico/{id}`
- `POST .../diagnostico` — registra serviços/peças, verifica estoque (leitura), cota
  faltantes e gera o orçamento (status → Em diagnóstico)
- `POST .../orcamento/enviar` — → Aguardando aprovação; notifica o cliente
- `POST .../execucao/concluir` — baixa peças reservadas, registra tempo; → Finalizada
- `POST .../orcamentos-adicionais` — lança orçamento adicional; envia ao cliente; notifica
- `POST .../pagamento` (`{ pago: true }`) · `POST .../entrega` (exige pago)
- `GET /relatorios/tempo-medio-execucao` (`?inicio=&fim=`)

**Acompanhamento do cliente (público, token da OS):**
- `GET /acompanhamento/{osId}`
- `POST .../orcamentos/{orcamentoId}/resposta` (`{ aprovado, justificativa? }`) — inicial ou adicional; roteia para aprovar/recusar

> **Comando automático não é rota:** reservar, encomendar, baixar, gerar orçamento, mudar
> status e reenviar notificação são efeitos disparados por política/evento dentro das ações
> acima — nunca endpoints próprios.

## Padrão de erro

```json
{ "erro": { "codigo": "NAO_AUTENTICADO", "mensagem": "Credenciais inválidas.", "detalhes": null } }
```

Status: 400 (validação), 401/403 (auth), 404, 409 (conflito), 422 (transição de status inválida).

## Testes

```bash
npm test          # unitários (domínio + aplicação) — 160 testes
npm run test:cov  # com cobertura (threshold de 80%)
npm run test:e2e  # end-to-end (fluxo HTTP de autenticação)
```

## Segurança

JWT nas rotas admin; `/acompanhamento` público por token da OS; validação de CPF/CNPJ e placa
no domínio; `npm audit` documentado em [`docs/seguranca-npm-audit.md`](docs/seguranca-npm-audit.md)
(sem vulnerabilidades críticas).
