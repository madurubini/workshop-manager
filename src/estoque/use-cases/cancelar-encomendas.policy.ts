import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
// Importação SÓ DE TIPO: o contrato do evento, sem acoplar ao módulo de OS.
import type { OSCancelada } from '../../ordem-servico/entities/eventos';
import {
  ENCOMENDA_REPOSITORY,
  EncomendaRepository,
} from './encomenda.repositorio';

/**
 * Política do Estoque: ao cancelar a OS, cancela as encomendas PENDENTE dela —
 * assim uma peça que chegar depois não fica reservada para uma OS morta. Efeito
 * posterior disparado pelo evento `ordem-servico.os-cancelada`.
 */
@Injectable()
export class CancelarEncomendasNoCancelamento {
  private readonly logger = new Logger(CancelarEncomendasNoCancelamento.name);

  constructor(
    @Inject(ENCOMENDA_REPOSITORY)
    private readonly encomendas: EncomendaRepository,
  ) {}

  @OnEvent('ordem-servico.os-cancelada')
  async tratar(evento: OSCancelada): Promise<void> {
    await this.encomendas.cancelarPendentesDaOrdem(evento.ordemId);
    this.logger.log(`Encomendas pendentes da OS ${evento.ordemId} canceladas.`);
  }
}
