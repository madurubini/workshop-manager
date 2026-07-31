import { Inject, Injectable } from '@nestjs/common';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../entities/ordem-servico';
import { PRIORIDADE_FILA } from '../entities/status-os';
import {
  FiltroOrdens,
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from './ordem-servico.repositorio';

/**
 * Casos de uso de consulta (leitura) da OS usados pelos controllers — para que
 * a apresentação nunca fale direto com o repositório.
 */
@Injectable()
export class ConsultarOrdemServico {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
  ) {}

  async listar(filtro?: FiltroOrdens): Promise<OrdemServico[]> {
    return this.ordens.listar(filtro);
  }

  /**
   * Fila de trabalho da oficina. O repositório traz só as OS ativas já
   * ordenadas por data (mais antigas primeiro); aqui aplicamos a prioridade
   * por status. O sort do JS é estável, então dentro do mesmo status a ordem
   * por data é preservada.
   */
  async listarFila(): Promise<OrdemServico[]> {
    const ordens = await this.ordens.listarFila();
    return ordens.sort(
      (uma, outra) =>
        (PRIORIDADE_FILA[uma.status] ?? Number.MAX_SAFE_INTEGER) -
        (PRIORIDADE_FILA[outra.status] ?? Number.MAX_SAFE_INTEGER),
    );
  }

  async buscar(id: string): Promise<OrdemServico> {
    const ordem = await this.ordens.buscarPorId(id);
    if (!ordem) {
      throw new ErroNaoEncontrado('Ordem de serviço não encontrada.', { id });
    }
    return ordem;
  }
}
