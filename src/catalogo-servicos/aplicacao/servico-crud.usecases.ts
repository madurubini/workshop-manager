import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { Servico } from '../dominio/servico';
import { SERVICO_REPOSITORY, ServicoRepository } from '../dominio/repositorio';

@Injectable()
export class CadastrarServico {
  constructor(
    @Inject(SERVICO_REPOSITORY)
    private readonly servicos: ServicoRepository,
  ) {}

  async executar(entrada: {
    nome: string;
    descricao?: string | null;
    precoBase: number;
  }): Promise<Servico> {
    const servico = Servico.criar({ id: randomUUID(), ...entrada });
    await this.servicos.inserir(servico);
    return servico;
  }
}

@Injectable()
export class AtualizarServico {
  constructor(
    @Inject(SERVICO_REPOSITORY)
    private readonly servicos: ServicoRepository,
  ) {}

  async executar(entrada: {
    id: string;
    nome?: string;
    descricao?: string | null;
    precoBase?: number;
  }): Promise<Servico> {
    const servico = await this.buscar(entrada.id);
    servico.atualizarDados(entrada);
    await this.servicos.salvar(servico);
    return servico;
  }

  private async buscar(id: string): Promise<Servico> {
    const servico = await this.servicos.buscarPorId(id);
    if (!servico || !servico.ativo) {
      throw new ErroNaoEncontrado('Serviço não encontrado.', { id });
    }
    return servico;
  }
}

@Injectable()
export class RemoverServico {
  constructor(
    @Inject(SERVICO_REPOSITORY)
    private readonly servicos: ServicoRepository,
  ) {}

  async executar(entrada: { id: string }): Promise<void> {
    const servico = await this.servicos.buscarPorId(entrada.id);
    if (!servico || !servico.ativo) {
      throw new ErroNaoEncontrado('Serviço não encontrado.', {
        id: entrada.id,
      });
    }
    servico.inativar();
    await this.servicos.salvar(servico);
  }
}
