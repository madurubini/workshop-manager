import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
// Importação SÓ DE TIPO: o contrato do evento, sem acoplar ao módulo de OS.
import type { OrcamentoAprovado } from '../../ordem-servico/dominio/eventos';
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
  async tratar(evento: OrcamentoAprovado): Promise<void> {
    for (const item of evento.itensPeca) {
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
          ordemId: evento.ordemId,
          quantidade: item.quantidade,
          status: 'RESERVADA',
        });
      } else {
        await this.fornecedor.encomendar({
          ordemId: evento.ordemId,
          pecaId: item.pecaId,
          quantidade: item.quantidade,
        });
      }
    }
  }
}
