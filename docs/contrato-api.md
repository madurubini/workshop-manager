# Contrato de API — Sistema de Oficina (MVP, Fase 1) — versão enxuta

Princípio do corte: **comando automático não é rota.** Tudo que é disparado por política (gerar orçamento, mudar status, verificar estoque, reservar/encomendar, baixar peça, reenviar notificação, registrar tempo) acontece como efeito colateral dentro de outra ação — não vira endpoint. Sobram as ações que um ator humano realmente dispara.

## Convenções

- Base URL: `/api/v1` · JSON · IDs em UUID · datas ISO-8601.
- JWT `Bearer` nas rotas **administrativas**. No **acompanhamento**: a consulta (`GET`) é pública pelo id da OS; **aprovar/recusar** exige o **token de acompanhamento** — um JWT assinado, com escopo da OS e validade, gerado no envio do orçamento e embutido no link (`Authorization: Bearer` ou `?token=`). O cliente aprova sem ter conta.
- Erro padrão: `{ "erro": { "codigo", "mensagem", "detalhes" } }`.
- Status: 200/201/204, 400 (validação), 401/403 (auth), 404, 409 (conflito), 422 (transição de status inválida).

---

## Autenticação
- `POST /auth/login` → `{ accessToken, expiresIn }`

## Usuários (admin) — cadastro
- `POST /usuarios` — cadastra um operador (`{ username, senha, papel }`). **Restrito ao GESTOR** (papel checado no token). Responde `{ id, username, papel, ativo }` (nunca a senha).

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
| `POST /ordens-servico/{id}/diagnostico/iniciar` | Mecânico inicia o diagnóstico (só o id da OS). | Status → Em diagnóstico. |
| `POST /ordens-servico/{id}/diagnostico` | Registra serviços + peças e conclui o diagnóstico. Exige o diagnóstico já iniciado (OS em Em diagnóstico). | Verifica estoque, cota faltantes, gera **e envia** o orçamento; status → Aguardando aprovação; notifica o cliente. |
| `POST /ordens-servico/{id}/execucao/concluir` | Mecânico conclui a execução. | Baixa peças reservadas, registra tempo; status → Finalizada (se nenhum orçamento estiver pendente). |
| `POST /ordens-servico/{id}/orcamentos-adicionais` | Lança um **orçamento adicional** durante a execução (`descricao`, `servicos`, `pecas`). | Cria um novo orçamento (tipo ADICIONAL) já enviado e notifica o cliente para autorizar. |
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
| `GET /acompanhamento/{osId}` | Consulta **pública** (pelo id da OS): status, orçamentos (inicial + adicionais) e histórico. |
| `POST /acompanhamento/{osId}/orcamentos/{orcamentoId}/resposta` | **Exige o token de acompanhamento da OS** (Bearer). Corpo `{ aprovado: bool, justificativa? }`. Vale para o orçamento **inicial** e os **adicionais** (identificados pelo `orcamentoId`). Inicial aprovado → Em execução (ou Aguardando peça, se alguma peça foi encomendada) + reserva/encomenda; inicial recusado → Cancelada. A OS sai de Aguardando peça para Em execução automaticamente quando as peças encomendadas dão entrada no estoque. Adicional aprovado → reserva/encomenda o trabalho extra; adicional recusado → segue só com o aprovado. O controller roteia para dois casos de uso (Aprovar / Recusar). |

---

## Resumo da contagem
- 4 CRUDs administrativos (clientes, veículos, serviços, peças) — exigidos pelo enunciado.
- 1 cadastro de usuário (`POST /usuarios`, GESTOR).
- 9 rotas na OS (3 de leitura/criação + 6 de ação).
- 2 rotas de acompanhamento do cliente (consulta + resposta a orçamento por id).
- 1 auth + 1 relatório.

Os comandos automáticos (reservar, encomendar, baixar, gerar orçamento, mudar status, reenviar notificação) **não** aparecem como rota: vivem dentro das ações acima, disparados por política.
