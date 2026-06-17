import { Inject, Injectable } from '@nestjs/common';
import { StatusOS } from '../dominio/status-os';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../dominio/repositorios';
import { StatusReparo } from '../dominio/itens';
import {
  OrdemAguardando,
  OrdemServicoConsultaApi,
  ReparoAguardando,
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

  async listarReparosAguardando(): Promise<ReparoAguardando[]> {
    const ordens = await this.ordens.listar({ status: StatusOS.EM_EXECUCAO });
    const pendentes: ReparoAguardando[] = [];
    for (const ordem of ordens) {
      for (const reparo of ordem.reparos) {
        if (reparo.status === StatusReparo.AGUARDANDO) {
          pendentes.push({
            ordemId: ordem.id,
            numero: ordem.numero,
            reparoId: reparo.id,
          });
        }
      }
    }
    return pendentes;
  }
}
