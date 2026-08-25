import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
// Só de tipo: o contrato do evento, sem acoplar ao módulo de OS em runtime.
import type { OrcamentoAprovado } from '../../ordem-servico/entities/eventos';
import { FORNECEDOR, Fornecedor } from './fornecedor';
import { PECA_REPOSITORY, PecaRepository } from './peca.repositorio';
import {
  ENCOMENDA_REPOSITORY,
  EncomendaRepository,
} from './encomenda.repositorio';

/**
 * Efeito disparado por evento, não rota: o Estoque escuta
 * `ordem-servico.orcamento-aprovado` e reserva ou encomenda as peças.
 *
 * A reserva é atômica (UPDATE condicional): se duas OS aprovarem a mesma peça
 * ao mesmo tempo, só reserva quem ainda tem saldo; a outra cai para encomenda.
 */
@Injectable()
export class ReservarNaAprovacao {
  private readonly logger = new Logger(ReservarNaAprovacao.name);

  constructor(
    @Inject(PECA_REPOSITORY)
    private readonly pecas: PecaRepository,
    @Inject(FORNECEDOR)
    private readonly fornecedor: Fornecedor,
    @Inject(ENCOMENDA_REPOSITORY)
    private readonly encomendas: EncomendaRepository,
  ) {}

  @OnEvent('ordem-servico.orcamento-aprovado')
  async aoAprovarOrcamento(evento: OrcamentoAprovado): Promise<void> {
    await this.reservarOuEncomendar(evento.ordemId, evento.itensPeca);
  }

  private async reservarOuEncomendar(
    ordemId: string,
    itensPeca: OrcamentoAprovado['itensPeca'],
  ): Promise<void> {
    for (const item of itensPeca) {
      if (item.situacao === 'DISPONIVEL') {
        const reservou = await this.pecas.reservarAtomico({
          pecaId: item.pecaId,
          ordemId,
          quantidade: item.quantidade,
        });
        if (reservou) {
          continue;
        }
        // O saldo acabou entre o diagnóstico e a aprovação: vira encomenda.
        this.logger.warn(
          `Peça ${item.pecaId} sem disponível na aprovação (corrida); encomendando.`,
        );
      }

      // Registra a pendência para saber qual OS aguarda quando a peça entrar.
      await this.fornecedor.encomendar({
        ordemId,
        pecaId: item.pecaId,
        quantidade: item.quantidade,
      });
      await this.encomendas.registrar({
        ordemId,
        pecaId: item.pecaId,
        quantidade: item.quantidade,
      });
    }
  }
}
