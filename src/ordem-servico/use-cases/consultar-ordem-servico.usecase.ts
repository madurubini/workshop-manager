import { Inject, Injectable } from '@nestjs/common';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../entities/ordem-servico';
import { PRIORIDADE_FILA } from '../entities/status-os';
import {
  FiltroOrdens,
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from './ordem-servico.repositorio';

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
   * O repositório já traz as ativas por data; aqui entra a prioridade por
   * status. O sort é estável, então a ordem por data sobrevive dentro do
   * mesmo status.
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
