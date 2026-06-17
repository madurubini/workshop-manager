import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CLIENTES_VEICULOS_API,
  ClientesVeiculosApi,
} from '../../clientes-veiculos/aplicacao/clientes-veiculos.api';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from '../dominio/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY,
  OrdemServicoRepository,
} from '../dominio/repositorios';

export interface EntradaAbrirOrdemServico {
  clienteId: string;
  veiculoId: string;
  problemaRelatado: string;
  por?: string | null;
}

/**
 * Caso de uso: abrir uma OS. Antes de criar, valida (de forma síncrona e
 * consistente) que o cliente existe e que o veículo é dele — usando a PORTA
 * PÚBLICA do módulo Clientes e Veículos. Não importamos o repositório do outro
 * módulo: dependemos apenas da abstração CLIENTES_VEICULOS_API.
 */
@Injectable()
export class AbrirOrdemServico {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY)
    private readonly ordens: OrdemServicoRepository,
    @Inject(CLIENTES_VEICULOS_API)
    private readonly clientesVeiculos: ClientesVeiculosApi,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: EntradaAbrirOrdemServico): Promise<OrdemServico> {
    const clienteOk = await this.clientesVeiculos.clienteExiste(
      entrada.clienteId,
    );
    if (!clienteOk) {
      throw new ErroNaoEncontrado('Cliente não encontrado.', {
        clienteId: entrada.clienteId,
      });
    }

    const veiculoOk = await this.clientesVeiculos.veiculoPertenceAoCliente(
      entrada.veiculoId,
      entrada.clienteId,
    );
    if (!veiculoOk) {
      throw new ErroValidacao(
        'Veículo não encontrado ou não pertence ao cliente.',
        { veiculoId: entrada.veiculoId, clienteId: entrada.clienteId },
      );
    }

    const numero = await this.ordens.proximoNumero();
    const ordem = OrdemServico.abrir({
      id: randomUUID(),
      numero,
      clienteId: entrada.clienteId,
      veiculoId: entrada.veiculoId,
      problemaRelatado: entrada.problemaRelatado,
      por: entrada.por,
    });

    await this.ordens.inserir(ordem);
    await this.eventos.publicar(...ordem.puxarEventos());
    return ordem;
  }
}
