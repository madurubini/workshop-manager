import { Inject, Injectable } from '@nestjs/common';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../entities/ordem-servico';
import { StatusOS } from '../entities/status-os';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from './ordem-servico.repositorio';

export interface EntradaAlterarStatus {
  ordemId: string;
  status: StatusOS;
  por?: string | null;
}

/**
 * Caso de uso: mover a OS para um status informado — correção manual do
 * gestor quando o fluxo normal não dá conta (a OS ficou presa, o cliente
 * desistiu, alguém avançou a etapa errada).
 *
 * É uma porta de manutenção, não o caminho do dia a dia: o fluxo normal passa
 * pelas rotas de negócio (diagnóstico, aprovação, conclusão, entrega), que
 * fazem a mudança de status junto com os efeitos que ela implica — reservar,
 * baixar peça, congelar preço, marcar o tempo de execução. Aqui só a transição
 * acontece: a máquina de estados é respeitada (transição fora da ordem →
 * ErroTransicaoInvalida → 422), mas os efeitos das outras camadas não são
 * refeitos.
 *
 * Os eventos que nascem da própria transição continuam saindo — em especial
 * `os-cancelada`, que faz o Estoque liberar as encomendas pendentes.
 */
@Injectable()
export class AlterarStatusDaOrdem {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: EntradaAlterarStatus): Promise<OrdemServico> {
    const ordem = await this.ordens.buscarPorId(entrada.ordemId);
    if (!ordem) {
      throw new ErroNaoEncontrado('Ordem de serviço não encontrada.', {
        ordemId: entrada.ordemId,
      });
    }
    ordem.transicionarPara(entrada.status, entrada.por);
    await this.ordens.atualizar(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }
}
