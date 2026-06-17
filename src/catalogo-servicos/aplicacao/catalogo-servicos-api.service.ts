import { Inject, Injectable } from '@nestjs/common';
import { CatalogoServicosApi, ServicoCatalogo } from './catalogo-servicos.api';
import { SERVICO_REPOSITORY, ServicoRepository } from '../dominio/repositorio';

@Injectable()
export class CatalogoServicosApiService implements CatalogoServicosApi {
  constructor(
    @Inject(SERVICO_REPOSITORY)
    private readonly servicos: ServicoRepository,
  ) {}

  async buscarServico(id: string): Promise<ServicoCatalogo | null> {
    const servico = await this.servicos.buscarPorId(id);
    if (!servico || !servico.ativo) {
      return null;
    }
    return { id: servico.id, nome: servico.nome, precoBase: servico.precoBase };
  }
}
