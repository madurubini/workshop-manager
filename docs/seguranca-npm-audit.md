# Nota de segurança — `npm audit`

Resultado do scan de vulnerabilidades das dependências (Fase 9), executado em
2026-06-17 com Node 20 / npm 10.

## Resumo

| Escopo | Críticas | Altas | Médias | Baixas | Total |
|---|---|---|---|---|---|
| **Produção** (`npm audit --omit=dev`) | 0 | 6 | 12 | 0 | **18** |
| Todas (inclui dev) | 0 | 10 | 36 | 3 | 49 |

**Nenhuma vulnerabilidade crítica.** A maioria está em **dependências de
desenvolvimento** (ex.: `webpack` via `@nestjs/cli`), que não vão para a imagem
de produção.

## Por que não foram todas corrigidas

As correções restantes só estão disponíveis via `npm audit fix --force`, que
faz **upgrades com breaking changes** — principalmente subir o NestJS 10 → 11.
Isso reescreveria parte da base e está fora do escopo deste MVP. O
`npm audit fix` (sem `--force`, só correções compatíveis) não tinha nada a
aplicar.

As vulnerabilidades de produção são em pacotes **transitivos** do próprio
NestJS/Swagger (`@nestjs/core`, `file-type`, `js-yaml`, `lodash`, `multer`),
e dependem do ecossistema lançar versões corrigidas compatíveis ou da migração
para o NestJS 11.

## Recomendação para evoluir

1. Planejar a migração para **NestJS 11** (resolve a maioria dos itens de
   produção) num ciclo dedicado, com a suíte de testes como rede de segurança.
2. Reexecutar `npm audit` a cada atualização de dependências.
3. Em produção, a imagem Docker usa `npm ci --omit=dev`, então as
   vulnerabilidades de dev (a maior parte) não são embarcadas.
