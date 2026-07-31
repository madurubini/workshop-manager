import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
// Importação SÓ DE TIPO: o contrato do evento do Estoque, sem acoplar runtime.
import type { PecaRecebida } from '../../estoque/entities/eventos';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from './ordem-servico.repositorio';

/**
 * Caminho de volta (estoque → OS): quando uma peça encomendada chega e é
 * reservada, a OS marca a linha como reservada e, se não falta mais nenhuma,
 * retoma a execução (Aguardando peça → Em execução). É um EFEITO POSTERIOR
 * disparado por evento — não é rota nem chamada direta do Estoque.
 */
@Injectable()
export class RetomarExecucaoAoReceberPeca {
  private readonly logger = new Logger(RetomarExecucaoAoReceberPeca.name);

  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  @OnEvent('estoque.peca-recebida')
  async aoReceberPeca(evento: PecaRecebida): Promise<void> {
    const ordem = await this.ordens.buscarPorId(evento.ordemId);
    if (!ordem) {
      this.logger.warn(
        `OS ${evento.ordemId} não encontrada ao receber peça ${evento.pecaId}.`,
      );
      return;
    }
    ordem.registrarRecebimentoDePeca(evento.pecaId);
    await this.ordens.atualizar(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
  }
}
