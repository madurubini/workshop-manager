import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
// Importação SÓ DE TIPO: o contrato dos eventos, sem acoplar ao módulo de OS.
import type { OrcamentoAprovado } from '../../ordem-servico/dominio/eventos';
import { FORNECEDOR, Fornecedor } from '../dominio/fornecedor';
import {
  ENCOMENDA_REPOSITORY,
  EncomendaRepository,
  PECA_REPOSITORY,
  PecaRepository,
} from '../dominio/repositorios';

/**
 * Política do Estoque: ao aprovar o orçamento, reserva as peças disponíveis e
 * encomenda as faltantes. É um EFEITO POSTERIOR disparado por evento — por isso
 * não é uma rota nem uma chamada direta do Ordem de Serviço. O Estoque apenas
 * "escuta" o evento `ordem-servico.orcamento-aprovado`.
 *
 * A reserva é ATÔMICA (UPDATE condicional no banco): mesmo que duas OS aprovem
 * a mesma peça ao mesmo tempo, só reserva quem ainda tem disponível; a outra
 * cai para encomenda. Sem corrida, sem dupla reserva.
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

  // Vale para o orçamento INICIAL e os ADICIONAIS: ambos chegam aqui pelo
  // mesmo evento `orcamento-aprovado`, com as peças daquele orçamento.
  @OnEvent('ordem-servico.orcamento-aprovado')
  async aoAprovarOrcamento(evento: OrcamentoAprovado): Promise<void> {
    await this.reservarOuEncomendar(evento.ordemId, evento.itensPeca);
  }

  private async reservarOuEncomendar(
    ordemId: string,
    itensPeca: OrcamentoAprovado['itensPeca'],
  ): Promise<void> {
    for (const item of itensPeca) {
      // Peça que estava disponível no diagnóstico: tenta reservar atomicamente.
      if (item.situacao === 'DISPONIVEL') {
        const reservou = await this.pecas.reservarAtomico({
          pecaId: item.pecaId,
          ordemId,
          quantidade: item.quantidade,
        });
        if (reservou) {
          continue;
        }
        // O disponível acabou entre o diagnóstico e a aprovação (outra OS levou):
        // cai para encomenda, como se estivesse em falta.
        this.logger.warn(
          `Peça ${item.pecaId} sem disponível na aprovação (corrida); encomendando.`,
        );
      }

      // Peça em falta (EM_COTACAO) ou que perdeu a corrida: encomenda.
      // Faz o pedido ao fornecedor E registra a pendência, para sabermos qual
      // OS aguardava quando a peça der ENTRADA no estoque.
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
