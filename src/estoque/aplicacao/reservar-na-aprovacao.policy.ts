import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
// Importação SÓ DE TIPO: o contrato dos eventos, sem acoplar ao módulo de OS.
import type {
  OrcamentoAprovado,
  ReparoAprovado,
} from '../../ordem-servico/dominio/eventos';
import { FORNECEDOR, Fornecedor } from '../dominio/fornecedor';
import {
  PECA_REPOSITORY,
  PecaRepository,
  RESERVA_REPOSITORY,
  ReservaRepository,
} from '../dominio/repositorios';

/**
 * Política do Estoque: ao aprovar o orçamento, reserva as peças disponíveis e
 * encomenda as faltantes. É um EFEITO POSTERIOR disparado por evento — por isso
 * não é uma rota nem uma chamada direta do Ordem de Serviço. O Estoque apenas
 * "escuta" o evento `ordem-servico.orcamento-aprovado`.
 */
@Injectable()
export class ReservarNaAprovacao {
  private readonly logger = new Logger(ReservarNaAprovacao.name);

  constructor(
    @Inject(PECA_REPOSITORY)
    private readonly pecas: PecaRepository,
    @Inject(RESERVA_REPOSITORY)
    private readonly reservas: ReservaRepository,
    @Inject(FORNECEDOR)
    private readonly fornecedor: Fornecedor,
  ) {}

  @OnEvent('ordem-servico.orcamento-aprovado')
  async aoAprovarOrcamento(evento: OrcamentoAprovado): Promise<void> {
    await this.reservarOuEncomendar(evento.ordemId, evento.itensPeca);
  }

  // Reparo aprovado reserva/encomenda exatamente como a aprovação do orçamento.
  @OnEvent('ordem-servico.reparo-aprovado')
  async aoAprovarReparo(evento: ReparoAprovado): Promise<void> {
    await this.reservarOuEncomendar(evento.ordemId, evento.itensPeca);
  }

  private async reservarOuEncomendar(
    ordemId: string,
    itensPeca: OrcamentoAprovado['itensPeca'],
  ): Promise<void> {
    for (const item of itensPeca) {
      const peca = await this.pecas.buscarPorId(item.pecaId);
      if (!peca) {
        this.logger.warn(`Peça ${item.pecaId} não encontrada ao reservar.`);
        continue;
      }

      // Reserva o que estiver disponível de fato; o resto vira encomenda.
      if (
        item.situacao === 'DISPONIVEL' &&
        peca.temDisponivel(item.quantidade)
      ) {
        peca.reservar(item.quantidade);
        await this.pecas.salvar(peca);
        await this.reservas.registrar({
          pecaId: item.pecaId,
          ordemId,
          quantidade: item.quantidade,
          status: 'RESERVADA',
        });
      } else {
        await this.fornecedor.encomendar({
          ordemId,
          pecaId: item.pecaId,
          quantidade: item.quantidade,
        });
      }
    }
  }
}
