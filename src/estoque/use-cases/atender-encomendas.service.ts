import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
import { PecaRecebida } from '../entities/eventos';
import { PECA_REPOSITORY, PecaRepository } from './peca.repositorio';
import {
  ENCOMENDA_REPOSITORY,
  EncomendaRepository,
} from './encomenda.repositorio';

/**
 * Quando uma peça dá ENTRADA no estoque, atende as encomendas PENDENTE daquela
 * peça (FIFO). Para cada uma, tenta a reserva ATÔMICA do total: se houver saldo,
 * reserva, marca a encomenda RECEBIDA e publica `estoque.peca-recebida` para a
 * OS retomar a execução. Se o saldo não cobre a próxima encomenda da fila, para
 * (ela continua PENDENTE até chegar mais peça). Não é rota: é efeito disparado
 * pela própria entrada de saldo.
 */
@Injectable()
export class AtenderEncomendasDaPeca {
  private readonly logger = new Logger(AtenderEncomendasDaPeca.name);

  constructor(
    @Inject(PECA_REPOSITORY)
    private readonly pecas: PecaRepository,
    @Inject(ENCOMENDA_REPOSITORY)
    private readonly encomendas: EncomendaRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(pecaId: string): Promise<void> {
    const pendentes = await this.encomendas.listarPendentesDaPeca(pecaId);
    for (const encomenda of pendentes) {
      const reservou = await this.pecas.reservarAtomico({
        pecaId: encomenda.pecaId,
        ordemId: encomenda.ordemId,
        quantidade: encomenda.quantidade,
      });
      if (!reservou) {
        // Saldo não cobre a próxima encomenda da fila: respeita o FIFO e para.
        break;
      }
      await this.encomendas.marcarRecebida(encomenda.id);
      await this.eventos.publicar(
        new PecaRecebida(
          encomenda.ordemId,
          encomenda.pecaId,
          encomenda.quantidade,
        ),
      );
      this.logger.log(
        `Encomenda ${encomenda.id} atendida: peça ${encomenda.pecaId} x${encomenda.quantidade} reservada para a OS ${encomenda.ordemId}.`,
      );
    }
  }
}
