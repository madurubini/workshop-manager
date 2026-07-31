import { Inject, Injectable } from '@nestjs/common';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../entities/ordem-servico';
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

  async buscar(id: string): Promise<OrdemServico> {
    const ordem = await this.ordens.buscarPorId(id);
    if (!ordem) {
      throw new ErroNaoEncontrado('Ordem de serviço não encontrada.', { id });
    }
    return ordem;
  }
}
