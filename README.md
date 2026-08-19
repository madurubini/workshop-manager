# Sistema de Oficina — Back-end

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
- **Fila de trabalho** (`GET /ordens-servico/fila`): OS ativas ordenadas por prioridade de status,
  mais antigas primeiro, sem as finalizadas/entregues.
- **Acompanhamento do cliente** por link público (token da OS): consultar o status e aprovar/recusar
  orçamentos sem login de operador.
- **Notificações** ao cliente disparadas por evento (ex.: orçamento enviado).

---

## Rodando localmente

Há dois caminhos. O **A (Docker)** é o recomendado — sobe API e banco com um comando e não exige
Node na máquina. O **B (Node na máquina)** é o de desenvolvimento, com hot reload.

### Pré-requisitos

| Caminho | O que precisa |
|---|---|
| **A — Docker** | Docker Engine com o plugin `docker compose` (v2). Só isso. |
| **B — Node local** | **Node 20+** (o `package.json` exige `engines.node >= 20`) e um Postgres acessível — o do compose serve. |
| Opcional | `jq`, só para os exemplos de `curl` deste README ficarem legíveis. |

> ⚠️ **VPN ligada bloqueia o acesso do host aos containers.** Se `curl localhost:3000` ou a conexão
> com o Postgres na 5433 travar sem responder, desligue a VPN e tente de novo.

---

### Caminho A — Docker (app + Postgres com um comando)

```bash
docker compose up --build          # em segundo plano: docker compose up --build -d
```

O que acontece no start (script `docker-entrypoint.sh`):

1. `prisma migrate deploy` — aplica as migrations versionadas em `prisma/migrations/`;
2. `node dist/prisma/seed.js` — roda o seed (idempotente: pode subir quantas vezes quiser);
3. `node dist/main` — sobe a API.

Está pronto quando aparecer `Nest application successfully started`. Confira:

```bash
curl http://localhost:3000/api/v1/health
# → {"status":"ok","info":{"database":{"status":"up"}}, ...}
```

| Recurso | Endereço |
|---|---|
| API | http://localhost:3000/api/v1 |
| Swagger (collection navegável) | http://localhost:3000/api/docs |
| OpenAPI JSON (importável no Postman/Insomnia) | http://localhost:3000/api/docs-json |
| Health check | http://localhost:3000/api/v1/health |
| Postgres (no host) | `localhost:5433` — usuário `oficina`, senha `oficina`, banco `oficina` |

Comandos do dia a dia:

```bash
docker compose logs -f app     # acompanhar os logs da API
docker compose ps              # estado dos containers e health
docker compose restart app     # reiniciar só a API
docker compose down            # parar tudo (mantém os dados no volume)
docker compose down -v         # parar e APAGAR o banco (volume oficina-pgdata)
```

> A porta **5433** é usada de propósito no host (a 5432 costuma estar ocupada por outro Postgres).
> Dentro da rede do compose a API fala com o banco em `db:5432`.

---

### Caminho B — Node na máquina (hot reload)

**1. Node 20.** Com nvm:

```bash
nvm use 20        # ou: export PATH="$HOME/.nvm/versions/node/v20.19.5/bin:$PATH"
node -v           # precisa ser >= 20
```

**2. Dependências e variáveis de ambiente:**

```bash
npm install
cp .env.example .env
```

O `.env.example` já aponta para o Postgres do compose (`localhost:5433`) — se você usa outro
banco, ajuste `DATABASE_URL`.

| Variável | Padrão do `.env.example` | Para que serve |
|---|---|---|
| `DATABASE_URL` | `postgresql://oficina:oficina@localhost:5433/oficina?schema=public` | Conexão do Prisma. |
| `PORT` | `3000` | Porta HTTP da API. |
| `NODE_ENV` | `development` | Ambiente da aplicação. |
| `JWT_SECRET` | `troque-este-segredo-em-producao` | Assinatura dos tokens (JWT de operador e token de acompanhamento). |
| `JWT_EXPIRES_IN` | `3600s` | Validade do token. |

**3. Suba só o banco** (a API vai rodar fora do Docker):

```bash
docker compose up -d db
```

**4. Prepare o schema e os dados de exemplo:**

```bash
npm run prisma:generate   # gera o Prisma Client (rode sempre que mudar prisma/schema.prisma)
npm run prisma:deploy     # aplica as migrations no banco
npm run seed              # usuário gestor + 2 serviços + 2 peças
```

**5. Suba a API em watch:**

```bash
npm run start:dev
# API ouvindo em http://localhost:3000/api/v1
# Swagger em http://localhost:3000/api/docs
```

---

## Autenticação

O seed cria um usuário administrativo e dados de exemplo (2 serviços e 2 peças — uma com saldo e
uma em falta, para exercitar a cotação/encomenda):

| username | senha       | papel  |
|----------|-------------|--------|
| `gestor` | `gestor123` | GESTOR |

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{ "username": "gestor", "senha": "gestor123" }' | jq -r .accessToken)
```

Use o token nas rotas administrativas: `Authorization: Bearer $TOKEN`. Novos usuários são criados
por um GESTOR via `POST /usuarios` (`{ username, senha, papel }`).

No Swagger, clique em **Authorize** e cole o `accessToken` para testar as rotas pelo navegador.

---

## Passeio de 2 minutos (fluxo completo via curl)

Com a API no ar e o `$TOKEN` do passo anterior (os exemplos usam `jq` para ler o JSON). Os ids de
serviço e peça vêm do seed. **Documento e placa são únicos** — se repetir a execução, troque os
valores ou recrie o banco (`docker compose down -v`), senão vem `409 CONFLITO`.

```bash
API=http://localhost:3000/api/v1
AUTH="Authorization: Bearer $TOKEN"
JSON="Content-Type: application/json"

# 1. Cliente e veículo
CLIENTE=$(curl -s -X POST $API/clientes -H "$AUTH" -H "$JSON" \
  -d '{ "documento": "11144477735", "nome": "Ana Souza" }' | jq -r .id)

VEICULO=$(curl -s -X POST $API/clientes/$CLIENTE/veiculos -H "$AUTH" -H "$JSON" \
  -d '{ "placa": "RTY7H21", "marca": "Ford", "modelo": "Ka", "ano": 2020 }' | jq -r .id)

# 2. Abrir a OS → "Recebida"
OS=$(curl -s -X POST $API/ordens-servico -H "$AUTH" -H "$JSON" \
  -d "{ \"clienteId\": \"$CLIENTE\", \"veiculoId\": \"$VEICULO\",
        \"problemaRelatado\": \"Barulho na suspensão\" }" | jq -r .id)

# 3. Iniciar o diagnóstico → "Em diagnóstico"
curl -s -X POST $API/ordens-servico/$OS/diagnostico/iniciar -H "$AUTH" | jq -r .status

# 4. Registrar itens e concluir o diagnóstico → orçamento gerado E enviado ao cliente
#    (11111111… = "Troca de óleo" R$ 120; 33333333… = "Filtro de óleo" R$ 35 — ambos do seed)
#    → status "Aguardando aprovação", total 190
ORCAMENTO=$(curl -s -X POST $API/ordens-servico/$OS/diagnostico -H "$AUTH" -H "$JSON" \
  -d '{ "servicos": [{ "servicoId": "11111111-1111-4111-8111-111111111111", "quantidade": 1 }],
        "pecas":    [{ "pecaId":    "33333333-3333-4333-8333-333333333333", "quantidade": 2 }] }' \
  | jq -r .orcamento.id)

# 5. Consulta pública do cliente (só o id da OS, sem login)
curl -s $API/acompanhamento/$OS | jq '{ status, total: .orcamentos[0].total }'

# 6. Cliente aprova o orçamento → "Em execução" (e o estoque reserva as peças)
#    Aprovar exige o TOKEN DA OS, que vai no link enviado ao cliente. No MVP o notificador
#    registra esse link no log da aplicação, então dá para pescá-lo de lá:
TOKEN_OS=$(docker compose logs app --since 5m | grep -o 'token=[A-Za-z0-9._-]*' | tail -1 | cut -d= -f2)

curl -s -X POST $API/acompanhamento/$OS/orcamentos/$ORCAMENTO/resposta \
  -H "Authorization: Bearer $TOKEN_OS" -H "$JSON" -d '{ "aprovado": true }' | jq -r .status

# 7. Fila de trabalho (a OS aparece nela enquanto está ativa) e reserva no estoque
curl -s $API/ordens-servico/fila -H "$AUTH" | jq -c '.[] | { numero, status }'
curl -s $API/pecas/33333333-3333-4333-8333-333333333333 -H "$AUTH" | jq -c '{ saldoFisico, reservado }'
# → num banco recém-semeado: {"saldoFisico":10,"reservado":2} — a baixa só acontece na conclusão

# 8. Concluir a execução, pagar e entregar
curl -s -X POST $API/ordens-servico/$OS/execucao/concluir -H "$AUTH" | jq -r .status   # Finalizada
curl -s -X POST $API/ordens-servico/$OS/pagamento -H "$AUTH" -H "$JSON" -d '{ "pago": true }' | jq -r .pago
curl -s -X POST $API/ordens-servico/$OS/entrega -H "$AUTH" | jq -r .status              # Entregue
```

> Sem o `Authorization` do passo 6 a resposta é `401 NAO_AUTENTICADO` ("Token de acompanhamento
> ausente") — a consulta é pública, mas **aprovar/recusar não é**. Rodando pelo caminho B (sem
> Docker), pegue o token no log do `npm run start:dev` em vez do `docker compose logs`.
>
> Para ver o desvio de **peça em falta**, refaça o passo 4 usando a peça `44444444-4444-4444-8444-444444444444`
> (saldo zero no seed): a aprovação leva a OS para *Aguardando peça*, e um
> `PATCH /pecas/{id}/estoque` com `{ "tipo": "ENTRADA", "quantidade": 1 }` a devolve para *Em execução*.

---

## Endpoints principais

Base `/api/v1`. A referência completa (schemas e exemplos) está no **Swagger** em `/api/docs`;
o contrato comentado, em [`docs/contrato-api.md`](docs/contrato-api.md).

- **Auth:** `POST /auth/login` · **Usuários (GESTOR):** `POST /usuarios`
- **CRUD (JWT):** `/clientes`, `/clientes/{id}/veiculos`, `/veiculos/{id}`, `/servicos`, `/pecas`,
  `PATCH /pecas/{id}/estoque`
- **Ordem de Serviço (JWT):** `POST /ordens-servico`, `GET /ordens-servico[/{id}]`,
  `GET /ordens-servico/fila`, `POST .../diagnostico/iniciar`, `POST .../diagnostico`,
  `POST .../execucao/concluir`, `POST .../orcamentos-adicionais`, `POST .../pagamento`,
  `POST .../entrega`, `GET /relatorios/tempo-medio-execucao`
- **Acompanhamento (público, token da OS):** `GET /acompanhamento/{osId}`,
  `POST .../orcamentos/{orcamentoId}/resposta`
- **Infra (público):** `GET /health`

**Padrão de erro:**

```json
{ "erro": { "codigo": "NAO_AUTENTICADO", "mensagem": "Credenciais inválidas.", "detalhes": null } }
```

Status: 400 (validação), 401/403 (auth), 404, 409 (conflito), 422 (transição de status inválida).
Todo erro sai nesse envelope — inclusive os que nascem no validador ou no banco —, e um 500 traz
`detalhes.idDaOcorrencia`, o mesmo id registrado no log. A tabela completa de códigos está em
[`docs/contrato-api.md`](docs/contrato-api.md#erros).

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
npm test          # unitários (entities + use-cases) — sem banco, sem HTTP
npm run test:cov  # com cobertura (threshold GLOBAL de 80%)
npm run test:e2e  # end-to-end (auth, health e fluxo completo da OS via HTTP)
```

Os testes de domínio mockam portas e repositórios, então rodam sem infraestrutura. Já o `test:e2e`
sobe o `AppModule` inteiro contra um **Postgres real**, em um banco dedicado (`oficina_e2e`) que ele
reseta a cada execução — o banco principal nunca é tocado. Prepare-o uma vez:

```bash
docker compose up -d db
docker exec oficina-db psql -U oficina -d oficina -c "CREATE DATABASE oficina_e2e"
npm run test:e2e
```

Para apontar o e2e a outro banco, exporte `DATABASE_URL_E2E`.

---

## Problemas comuns

| Sintoma | Causa provável / solução |
|---|---|
| `curl localhost:3000` trava sem resposta | **VPN ligada** — o host não alcança o container. Desligue a VPN. |
| `Can't reach database server at localhost:5433` | O container `db` não subiu (`docker compose ps`) ou a porta está tomada por outro Postgres. |
| `port is already allocated` na 3000/5433 | Outro processo usa a porta: pare-o ou mude o mapeamento em `docker-compose.yml`. |
| Erro de tipo do `@prisma/client` após mexer no schema | Rode `npm run prisma:generate` antes do build/teste. |
| `test:e2e` falha em `database "oficina_e2e" does not exist` | Crie o banco (ver seção Testes). |
| `npm ci` reclama da versão do Node | Use Node 20+ (`nvm use 20`). |
| Banco com dados estranhos depois de experimentos | `docker compose down -v && docker compose up --build` recria tudo do zero. |

---

## Arquitetura (resumo)

Monolito modular em **DDD** (NestJS + Prisma): um deploy, um banco, organizado por **contexto
delimitado** em `src/` (`identidade`, `clientes-veiculos`, `catalogo-servicos`, `estoque`,
`ordem-servico`, `notificacoes`, `compartilhado`). Cada módulo segue **Clean Architecture** com
três camadas internas — `entities/` (entidades, VOs e eventos), `use-cases/` (casos de uso e as
portas de que dependem) e `adapters/` (controllers, presenters, gateways e DTOs) —, com a regra
de dependência apontando para dentro.

Módulos se comunicam de duas formas, nunca importando a entidade ou o repositório um do outro:
**porta pública** (interface + token) quando precisam de resposta síncrona, e **evento**
(event bus in-process) quando é efeito posterior — é assim que aprovar um orçamento faz o estoque
reservar e as notificações avisarem o cliente, sem que um conheça o outro.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/contrato-api.md`](docs/contrato-api.md) | Endpoints, payloads e o princípio "comando automático não é rota". |
| [`docs/linguagem-ubiqua.md`](docs/linguagem-ubiqua.md) | Vocabulário do domínio (Event Storming). |
| [`docs/schema.prisma`](docs/schema.prisma) | Cópia documental do schema de dados. |
| [`docs/adr/`](docs/adr) | Decisões da Fase 1 (ex.: escolha do banco). |
| [`docs/fase2/rules.md`](docs/fase2/rules.md) | Regras operacionais da Clean Architecture aplicadas aqui. |
| [`docs/fase2/decisoes-arquiteturais.md`](docs/fase2/decisoes-arquiteturais.md) | O porquê de cada decisão da refatoração (ADR-01 a ADR-12). |
| [`docs/relatorio-vulnerabilidades.md`](docs/relatorio-vulnerabilidades.md) | Análise de segurança do MVP. |
