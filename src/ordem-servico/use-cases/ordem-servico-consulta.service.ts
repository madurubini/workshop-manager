import { Inject, Injectable } from '@nestjs/common';
import { StatusOS } from '../entities/status-os';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from './ordem-servico.repositorio';
import { StatusOrcamento, TipoOrcamento } from '../entities/itens';
import {
  OrcamentoAdicionalAguardando,
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

  async listarOrcamentosAdicionaisAguardando(): Promise<
    OrcamentoAdicionalAguardando[]
  > {
    const ordens = await this.ordens.listar({ status: StatusOS.EM_EXECUCAO });
    const pendentes: OrcamentoAdicionalAguardando[] = [];
    for (const ordem of ordens) {
      for (const orcamento of ordem.orcamentos) {
        if (
          orcamento.tipo === TipoOrcamento.ADICIONAL &&
          orcamento.status === StatusOrcamento.ENVIADO
        ) {
          pendentes.push({
            ordemId: ordem.id,
            numero: ordem.numero,
            orcamentoId: orcamento.id,
          });
        }
      }
    }
    return pendentes;
  }
}
