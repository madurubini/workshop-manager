import { Inject, Injectable } from '@nestjs/common';
import { StatusOS } from '../dominio/status-os';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../dominio/repositorios';
import {
  OrdemAguardando,
  OrdemServicoConsultaApi,
} from './ordem-servico-consulta.api';

@Injectable()
export class OrdemServicoConsultaService implements OrdemServicoConsultaApi {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
  ) {}

  async listarAguardandoResposta(): Promise<OrdemAguardando[]> {
    const ordens = await this.ordens.listar({
      status: StatusOS.AGUARDANDO_APROVACAO,
    });
    return ordens.map((o) => ({ ordemId: o.id, numero: o.numero }));
  }
}
