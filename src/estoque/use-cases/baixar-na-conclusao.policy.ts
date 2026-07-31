import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ExecucaoConcluida } from '../../ordem-servico/entities/eventos';
import { PECA_REPOSITORY, PecaRepository } from './peca.repositorio';
import { RESERVA_REPOSITORY, ReservaRepository } from './reserva.repositorio';

/**
 * Política do Estoque: ao concluir a execução, dá baixa nas peças reservadas
 * da OS (retirada efetiva). Reduz saldo físico e reservado e marca as reservas
 * como BAIXADA. Disparada pelo evento `execucao-concluida` — efeito posterior.
 */
@Injectable()
export class BaixarNaConclusao {
  private readonly logger = new Logger(BaixarNaConclusao.name);

  constructor(
    @Inject(PECA_REPOSITORY)
    private readonly pecas: PecaRepository,
    @Inject(RESERVA_REPOSITORY)
    private readonly reservas: ReservaRepository,
  ) {}

  @OnEvent('ordem-servico.execucao-concluida')
  async tratar(evento: ExecucaoConcluida): Promise<void> {
    const reservadas = await this.reservas.listarReservadasDaOrdem(
      evento.ordemId,
    );
    for (const reserva of reservadas) {
      const peca = await this.pecas.buscarPorId(reserva.pecaId);
      if (!peca) {
        this.logger.warn(`Peça ${reserva.pecaId} não encontrada ao baixar.`);
        continue;
      }
      peca.baixar(reserva.quantidade);
      await this.pecas.salvar(peca);
    }
    await this.reservas.marcarBaixadasDaOrdem(evento.ordemId);
  }
}
