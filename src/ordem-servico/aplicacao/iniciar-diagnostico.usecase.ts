import { Inject, Injectable } from '@nestjs/common';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../dominio/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../dominio/repositorios';

/**
 * Caso de uso: iniciar o diagnóstico. Leva a OS de "Recebida" para "Em
 * diagnóstico" — o mecânico assume a OS antes de registrar serviços e peças
 * (que, ao serem registrados, concluem o diagnóstico e enviam o orçamento).
 */
@Injectable()
export class IniciarDiagnostico {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: {
    ordemId: string;
    por?: string | null;
  }): Promise<OrdemServico> {
    const ordem = await this.ordens.buscarPorId(entrada.ordemId);
    if (!ordem) {
      throw new ErroNaoEncontrado('Ordem de serviço não encontrada.', {
        ordemId: entrada.ordemId,
      });
    }
    ordem.iniciarDiagnostico(entrada.por);
    await this.ordens.atualizar(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }
}
