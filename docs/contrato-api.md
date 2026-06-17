# Contrato de API — Sistema de Oficina (MVP, Fase 1) — versão enxuta

Princípio do corte: **comando automático não é rota.** Tudo que é disparado por política (gerar orçamento, mudar status, verificar estoque, reservar/encomendar, baixar peça, reenviar notificação, registrar tempo) acontece como efeito colateral dentro de outra ação — não vira endpoint. Sobram as ações que um ator humano realmente dispara.

## Convenções

- Base URL: `/api/v1` · JSON · IDs em UUID · datas ISO-8601.
- JWT `Bearer` nas rotas **administrativas**. As rotas de **acompanhamento** do cliente usam token da OS (link enviado) ou login do cliente.
- Erro padrão: `{ "erro": { "codigo", "mensagem", "detalhes" } }`.
- Status: 200/201/204, 400 (validação), 401/403 (auth), 404, 409 (conflito), 422 (transição de status inválida).

---

## Autenticação
- `POST /auth/login` → `{ accessToken, expiresIn }`

## Clientes (admin) — CRUD
- `POST /clientes` · `GET /clientes` · `GET /clientes/{id}` · `PUT /clientes/{id}` · `DELETE /clientes/{id}`
- Valida CPF/CNPJ; documento único.

## Veículos (admin) — CRUD
- `POST /clientes/{clienteId}/veiculos` · `GET /veiculos/{id}` · `PUT /veiculos/{id}` · `DELETE /veiculos/{id}`
- Valida placa; placa única.

## Serviços — catálogo (admin) — CRUD
- `POST /servicos` · `GET /servicos` · `GET /servicos/{id}` · `PUT /servicos/{id}` · `DELETE /servicos/{id}`

## Peças e estoque (admin) — CRUD + ajuste
- `POST /pecas` · `GET /pecas` · `GET /pecas/{id}` · `PUT /pecas/{id}` · `DELETE /pecas/{id}`
- `PATCH /pecas/{id}/estoque` — ajuste manual de saldo (`{ tipo, quantidade, motivo }`).

---

## Ordens de Serviço (admin)

| Método / Rota | O que faz | Efeitos automáticos |
|---|---|---|
| `POST /ordens-servico` | Abre a OS (`clienteId`, `veiculoId`, `problemaRelatado`). | Status → Recebida. |
| `GET /ordens-servico` | Lista/filtra (`?status=&clienteId=`). | — |
| `GET /ordens-servico/{id}` | Detalhe completo da OS. | — |
| `POST /ordens-servico/{id}/diagnostico` | Registra serviços + peças e conclui o diagnóstico num payload só. | Verifica estoque, cota faltantes, gera o orçamento; status passa por Em diagnóstico. |
| `POST /ordens-servico/{id}/orcamento/enviar` | Envia o orçamento ao cliente. | Status → Aguardando aprovação; notifica o cliente. |
| `POST /ordens-servico/{id}/execucao/concluir` | Mecânico conclui a execução. | Baixa peças reservadas, registra tempo; status → Finalizada (se sem reparo pendente). |
| `POST /ordens-servico/{id}/reparos-adicionais` | Lança um reparo adicional (`servicos`, `pecas`). | Atualiza o orçamento e notifica o cliente para autorizar. |
| `POST /ordens-servico/{id}/pagamento` | Marca a OS como paga (pagamento manual). Corpo `{ pago: true }`. | Libera a entrega. |
| `POST /ordens-servico/{id}/entrega` | Entrega o veículo e encerra a OS. | Status → Entregue → encerrada. Exige pagamento confirmado. |
| `GET /relatorios/tempo-medio-execucao` | Tempo médio de execução (`?periodo=`). | — |

Exemplo do diagnóstico (a rota que mais concentra):
```json
// POST /ordens-servico/{id}/diagnostico
// req
{ "servicos": [ { "servicoId": "uuid", "quantidade": 1 } ],
  "pecas":    [ { "pecaId": "uuid", "quantidade": 4 } ] }
// res 200
{ "status": "Em diagnóstico",
  "orcamento": { "id": "uuid", "totalServicos": 120.00, "totalPecas": 540.00, "total": 660.00 },
  "pendenciasEstoque": [ { "pecaId": "uuid", "situacao": "EM_COTACAO" } ] }
// 422 se concluído antes de o estoque responder
```

---

## Acompanhamento e decisões do cliente (app)

| Método / Rota | O que faz |
|---|---|
| `GET /acompanhamento/{osId}` | Consulta pública: status, orçamento e histórico. |
| `POST /acompanhamento/{osId}/orcamento/resposta` | Corpo `{ aprovado: bool, justificativa? }`. Aprovado → Em execução + reserva/encomenda; recusado → Cancelada. O controller roteia para dois casos de uso distintos (Aprovar / Recusar). |
| `POST /acompanhamento/{osId}/reparos-adicionais/{reparoId}/resposta` | Corpo `{ aprovado: bool }`. Aprovado → volta para reserva/execução; recusado → segue só com o aprovado. |

---

## Resumo da contagem
- 4 CRUDs administrativos (clientes, veículos, serviços, peças) — exigidos pelo enunciado.
- 9 rotas na OS (3 de leitura/criação + 6 de ação).
- 3 rotas de acompanhamento do cliente.
- 1 auth + 1 relatório.

Os comandos automáticos (reservar, encomendar, baixar, gerar orçamento, mudar status, reenviar notificação) **não** aparecem como rota: vivem dentro das ações acima, disparados por política.
