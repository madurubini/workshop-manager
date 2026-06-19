import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
import { MontadorDeItens } from './montador-de-itens.service';

export interface EntradaRegistrarDiagnostico {
  ordemId: string;
  servicos: { servicoId: string; quantidade: number }[];
  pecas: { pecaId: string; quantidade: number }[];
  por?: string | null;
}

/**
 * Caso de uso central da Fatia 2. Monta os itens (preços congelados, estoque
 * verificado só em leitura, faltantes cotados) via MontadorDeItens e delega à
 * OS o registro do diagnóstico — que gera o orçamento e leva a OS de Recebida
 * → Em diagnóstico.
 */
@Injectable()
export class RegistrarDiagnostico {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    private readonly montador: MontadorDeItens,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: EntradaRegistrarDiagnostico): Promise<OrdemServico> {
    const ordem = await this.ordens.buscarPorId(entrada.ordemId);
    if (!ordem) {
      throw new ErroNaoEncontrado('Ordem de serviço não encontrada.', {
        ordemId: entrada.ordemId,
      });
    }

    const servicos = await this.montador.montarServicos(entrada.servicos);
    const pecas = await this.montador.montarPecas(
      entrada.ordemId,
      entrada.pecas,
    );

    ordem.registrarDiagnostico({
      servicos,
      pecas,
      orcamentoId: randomUUID(),
      por: entrada.por,
    });

    await this.ordens.atualizar(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }
}
