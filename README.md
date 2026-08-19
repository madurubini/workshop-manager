# Sistema de Oficina — Back-end (MVP)

Back-end do Sistema de Atendimento e Execução de Serviços de uma oficina mecânica:
cadastro de clientes/veículos, **Ordem de Serviço** (diagnóstico → orçamento → execução →
entrega), controle de **estoque de peças** e acompanhamento do cliente por link público.

**Stack:** TypeScript · NestJS 11 · PostgreSQL 16 + Prisma 5 · JWT · Swagger · Docker.

---

## Objetivos

Digitalizar o atendimento de uma oficina mecânica, do recebimento do veículo à entrega,
concentrando as regras de negócio no agregado **Ordem de Serviço**:

- **Cadastros:** clientes, veículos, serviços e peças (com saldo de estoque).
- **Ordem de Serviço ponta a ponta:** recebimento → diagnóstico → orçamento → aprovação do
  cliente → execução → finalização → pagamento → entrega, com uma **máquina de estados** que
  rejeita transições inválidas (HTTP 422).
- **Orçamento com preço congelado** (snapshot no diagnóstico) e **vários orçamentos por OS**: um
  inicial e adicionais para reparos descobertos durante a execução.
- **Estoque e cotação:** peça disponível é reservada na aprovação; peça em falta é **encomendada**,
  a OS fica em *Aguardando peça* e **retoma a execução automaticamente** quando a peça dá entrada.
- **Acompanhamento do cliente** por link público (token da OS): consultar o status e aprovar/recusar
  orçamentos sem login de operador.
- **Notificações** ao cliente disparadas por evento (ex.: orçamento enviado).

---

## Pré-requisitos

- **Opção Docker (recomendada):** apenas **Docker** instalado — não precisa de Node nem Postgres na máquina.
- **Opção local:** **Node 20** (o `package.json` exige `engines.node >= 20`) e um Postgres acessível.

---

## Como executar

### Docker (app + Postgres com um comando)

```bash
docker compose up --build
```

No start, o container aplica as migrations versionadas (`prisma migrate deploy`), roda o seed
(usuário + dados de exemplo) e sobe a API. Quando aparecer `Nest application successfully
started`, está pronto:

- **API:** http://localhost:3000/api/v1
- **Swagger:** http://localhost:3000/api/docs
- **Health check:** http://localhost:3000/api/v1/health → `{"status":"ok"}`
- **Postgres** exposto no host em **5433**

Em segundo plano: `docker compose up --build -d`. Para encerrar: `docker compose down`
(ou `down -v` para apagar também o volume do banco).


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
  `POST .../diagnostico/iniciar`, `POST .../diagnostico`, `POST .../execucao/concluir`,
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

## Fluxo de uso (jornada da OS)

Sequência típica via API. As rotas administrativas exigem `Authorization: Bearer <accessToken>`;
as de `/acompanhamento` usam o **token da OS** (devolvido na notificação ao cliente).

1. **Abrir a OS** — `POST /ordens-servico` `{ clienteId, veiculoId, problemaRelatado }` → *Recebida*.
2. **Iniciar o diagnóstico** — `POST /ordens-servico/{id}/diagnostico/iniciar` → *Em diagnóstico*
   (o mecânico assume a OS antes de lançar itens).
3. **Concluir o diagnóstico** — `POST /ordens-servico/{id}/diagnostico` `{ servicos, pecas }`:
   gera o orçamento, verifica o estoque (cota as peças em falta), **envia ao cliente** e notifica →
   *Aguardando aprovação*.
4. **Cliente responde** — `POST /acompanhamento/{osId}/orcamentos/{orcamentoId}/resposta`
   `{ aprovado }`. Aprovado → *Em execução* (ou *Aguardando peça*, se algo foi encomendado);
   recusado → *Cancelada*.
5. **Peça encomendada chega** — `PATCH /pecas/{id}/estoque` `{ tipo: "ENTRADA", quantidade }`:
   a OS sai de *Aguardando peça* e **retoma para *Em execução* automaticamente** (registrada como
   ação do "sistema" no histórico).
6. **Concluir a execução** — `POST /ordens-servico/{id}/execucao/concluir` → *Finalizada*
   (bloqueia se houver orçamento pendente ou peça por chegar).
7. **Pagamento e entrega** — `POST /ordens-servico/{id}/pagamento` `{ pago: true }`, depois
   `POST /ordens-servico/{id}/entrega` → *Entregue* (a entrega exige pagamento confirmado).

> Reparos descobertos durante a execução viram **orçamento adicional**
> (`POST /ordens-servico/{id}/orcamentos-adicionais`), aprovado pelo cliente no mesmo endpoint de
> acompanhamento; a OS só finaliza quando nenhum orçamento está pendente.

---

## Testes

```bash
npm test          # unitários (domínio + aplicação)
npm run test:cov  # com cobertura (threshold GLOBAL de 80%)
npm run test:e2e  # end-to-end (auth, health e fluxo completo da OS via HTTP)
```

Os testes de domínio rodam **sem banco nem HTTP** (mockam portas/repositórios). O `test:e2e`
exige um Postgres acessível e usa um banco dedicado (`oficina_e2e`).

---

## Arquitetura (resumo)

Monolito modular em **DDD** (NestJS + Prisma): um deploy, um banco, organizado por **contexto
delimitado** em `src/` (`identidade`, `clientes-veiculos`, `catalogo-servicos`, `estoque`,
`ordem-servico`, `notificacoes`, `compartilhado`). Cada módulo segue **Clean Architecture** com
três camadas internas — `entities/` (entidades, VOs e eventos), `use-cases/` (casos de uso e as
portas de que dependem) e `adapters/` (controllers, presenters, gateways e DTOs) —, com a regra
de dependência apontando para dentro. Detalhes do domínio e do contrato em `docs/`; as decisões
da refatoração em `docs/fase2/`.
