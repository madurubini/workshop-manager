import { Orcamento, SituacaoPecaOrcada } from '../../entities/itens';
import { OrdemServico } from '../../entities/ordem-servico';
import { ROTULO_STATUS } from '../../entities/status-os';
import {
  AcompanhamentoRespostaDto,
  DiagnosticoRespostaDto,
  OrcamentoDto,
  OrdemServicoRespostaDto,
} from '../dtos';

/** Traduz um orçamento (entidade interna da OS) para o DTO de resposta. */
function apresentarOrcamento(orcamento: Orcamento): OrcamentoDto {
  return {
    id: orcamento.id,
    tipo: orcamento.tipo,
    descricao: orcamento.descricao,
    totalServicos: orcamento.totalServicos,
    totalPecas: orcamento.totalPecas,
    total: orcamento.total,
    status: orcamento.status,
    servicos: orcamento.servicos.map((item) => ({
      servicoId: item.servicoId,
      descricao: item.descricao,
      quantidade: item.quantidade,
      precoAplicado: item.precoAplicado,
    })),
    pecas: orcamento.pecas.map((item) => ({
      pecaId: item.pecaId,
      descricao: item.descricao,
      quantidade: item.quantidade,
      precoAplicado: item.precoAplicado,
      situacao: item.situacao,
    })),
  };
}

/** Presenter completo da OS (visão administrativa). */
export function apresentarOrdemServico(
  ordem: OrdemServico,
): OrdemServicoRespostaDto {
  return {
    id: ordem.id,
    numero: ordem.numero,
    clienteId: ordem.clienteId,
    veiculoId: ordem.veiculoId,
    problemaRelatado: ordem.problemaRelatado,
    status: ROTULO_STATUS[ordem.status],
    versao: ordem.versao,
    pago: ordem.pago,
    pagoEm: ordem.pagoEm,
    criadoEm: ordem.criadoEm,
    historico: ordem.historico.map((h) => ({
      status: ROTULO_STATUS[h.status],
      em: h.em,
      por: h.por,
    })),
    orcamentos: ordem.orcamentos.map(apresentarOrcamento),
  };
}

/** Visão pública do cliente (acompanhamento): sem dados internos. */
export function apresentarAcompanhamento(
  ordem: OrdemServico,
): AcompanhamentoRespostaDto {
  return {
    numero: ordem.numero,
    problemaRelatado: ordem.problemaRelatado,
    status: ROTULO_STATUS[ordem.status],
    pago: ordem.pago,
    orcamentos: ordem.orcamentos.map(apresentarOrcamento),
    historico: ordem.historico.map((h) => ({
      status: ROTULO_STATUS[h.status],
      em: h.em,
      por: h.por,
    })),
  };
}

/** Resposta do diagnóstico (usa o orçamento inicial). */
export function apresentarDiagnostico(
  ordem: OrdemServico,
): DiagnosticoRespostaDto {
  const orcamento = ordem.orcamento!;
  return {
    status: ROTULO_STATUS[ordem.status],
    orcamento: apresentarOrcamento(orcamento),
    pendenciasEstoque: orcamento.pecas
      .filter((item) => item.situacao !== SituacaoPecaOrcada.DISPONIVEL)
      .map((item) => ({ pecaId: item.pecaId, situacao: item.situacao })),
  };
}
