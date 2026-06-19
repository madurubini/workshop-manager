# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Domínio, comentários, nomes de classe/método e mensagens de commit em **Português BR** (linguagem ubíqua do negócio). Responda em Português BR.

## Ambiente

- **Node 20** (o Node 16 da máquina tem npm quebrado). Via nvm: prefixe os comandos com `export PATH="$HOME/.nvm/versions/node/v20.19.5/bin:$PATH"`.
- **Docker**: `docker compose up --build` sobe app + Postgres. O Postgres é exposto no host na porta **5433** (a 5432 já é usada por outro container na máquina).
- **Smoke tests / acesso host→container exigem a VPN desligada** — com VPN ligada o host não alcança o container do Postgres e as chamadas travam.

## Comandos

```bash
npm run build              # nest build → dist/main.js
npm run start:dev          # API em watch (http://localhost:3000/api/v1, Swagger em /api/docs)
npm run lint               # eslint --fix
npm test                   # unitários (jest)
npm run test:cov           # cobertura; threshold GLOBAL de 80% (statements/branches/functions/lines)
npm run test:e2e           # e2e (test/jest-e2e.json)

npx jest caminho/arquivo.spec.ts      # um arquivo
npx jest -t "trecho do nome do teste" # por nome

npm run prisma:generate    # regenerar o client APÓS mudar prisma/schema.prisma
npx prisma db push         # sincronizar schema no banco (dev; o Docker faz isso no start)
npm run seed               # ts-node prisma/seed.ts (gestor/gestor123 + 2 serviços + 2 peças)
```

Ao mudar `prisma/schema.prisma`, rode `npx prisma generate` antes do `tsc`/build, senão os tipos de `@prisma/client` ficam desatualizados.

## Fonte de verdade

Os arquivos em `docs/` mandam no domínio e devem ser mantidos em sincronia com o código:
- `docs/projeto.md` — enunciado/requisitos (checklist do que validar).
- `docs/linguagem-ubiqua.md` — vocabulário do domínio.
- `docs/contrato-api.md` — endpoints e payloads.
- `docs/schema.prisma` — **cópia documental** do `prisma/schema.prisma`; ao editar o schema, replique nos dois (`cp prisma/schema.prisma docs/schema.prisma`).

## Arquitetura

DDD em **monolito modular** (NestJS + Prisma + Postgres). Um deploy, um banco, organizado por **contexto delimitado**. Módulos em `src/`: `compartilhado` (shared kernel: Prisma, erros, classes-base, VOs, event bus), `identidade`, `clientes-veiculos`, `catalogo-servicos`, `estoque`, `ordem-servico` (núcleo), `notificacoes`.

Cada módulo de domínio tem **4 camadas internas**: `dominio` (entidades, value objects, eventos, portas, regras), `aplicacao` (casos de uso), `infraestrutura` (adaptadores Prisma/externos), `interfaces` (controllers REST, DTOs, Swagger).

### Regra de ouro (a fronteira entre módulos)

Um módulo **nunca importa entidade nem repositório de outro**. A comunicação acontece de duas formas:

1. **Porta pública (interface + Symbol token)** quando precisa de resposta síncrona e consistente. Ex.: `CLIENTES_VEICULOS_API`, `CATALOGO_SERVICOS_API`, `ESTOQUE_API`, `ORDEM_SERVICO_CONSULTA`. O módulo exporta só a porta; o consumidor injeta pelo token (`@Inject(TOKEN)`).
2. **Evento (event bus in-process, `@nestjs/event-emitter`)** quando é efeito posterior. O publicador chama `PublicadorDeEventos.publicar(...ordem.puxarEventos())` (que **aguarda** os assinantes); os outros módulos reagem com `@OnEvent('...')`. Para não acoplar no runtime, o assinante importa a classe do evento com **`import type`** (só o contrato, sem dependência de runtime); campos que cruzam a fronteira são strings simples, não enums internos.

Exemplos do fan-out: ao aprovar um orçamento, o núcleo publica `orcamento-aprovado`; o `estoque` reage reservando/encomendando e o `notificacoes` reage avisando — um sem conhecer o outro.

### Núcleo: agregado OrdemServico

`src/ordem-servico/dominio/ordem-servico.ts` é a raiz de agregado e guarda invariantes:
- **Máquina de estados** (`status-os.ts`): `Recebida → Em diagnóstico → Aguardando aprovação → Em execução → Finalizada → Entregue` (ou `Cancelada`). Toda mudança passa por `transicionarPara`; transição inválida → `ErroTransicaoInvalida` → **HTTP 422**.
- **Vários orçamentos por OS**: um `INICIAL` (diagnóstico) e zero ou mais `ADICIONAL` (reparos descobertos na execução). Cada um é aprovado/recusado por id. Aprovar/recusar o INICIAL move o status; os ADICIONAL não. A OS só finaliza quando nenhum orçamento está pendente.
- **Congelamento de preço**: as linhas `ServicoOrcado`/`PecaOrcada` guardam `precoAplicado` (snapshot), não puxam o preço do catálogo/estoque na exibição.
- **Optimistic lock** (`versao`): o repositório Prisma atualiza com `where: { id, versao }` e lança `ErroConflito` se a versão mudou.

### Persistência do agregado (padrão importante)

Em `prisma-ordem-servico.repository.ts`, `atualizar()` trata o agregado como fonte de verdade: dentro de uma transação, **apaga e recria** os filhos (histórico, orçamentos e suas linhas). Respeite a ordem de FK — apague as linhas (`servico_orcado`/`peca_orcada`) antes dos `orcamento`, e recrie os `orcamento` antes das linhas.

### Erros e autenticação

- Envelope de erro padrão `{ "erro": { "codigo", "mensagem", "detalhes" } }` via filtro global (`compartilhado/erros`). As classes de domínio (`ErroValidacao` 400, `ErroNaoAutenticado` 401, `ErroNaoEncontrado` 404, `ErroConflito` 409, `ErroTransicaoInvalida` 422) mapeiam os status HTTP.
- **JWT** (`@nestjs/jwt` + Passport) nas rotas administrativas (`JwtAuthGuard`). Restrição por papel com `@Papeis('GESTOR')` + `PapeisGuard`. As rotas de `/acompanhamento` são **públicas** (token = id da OS, no MVP).

## Convenções

- **Comando automático não é rota**: reservar, encomendar, baixar, gerar orçamento, mudar status e reenviar notificação são efeitos disparados por política/evento dentro de outra ação — nunca endpoints próprios.
- Cobertura crítica em `dominio/` + `aplicacao/`; testes de domínio rodam sem banco nem HTTP (mockam portas/repositórios).
