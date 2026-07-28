import { Inject, Injectable } from '@nestjs/common';
import {
  GERADOR_DE_ID,
  GeradorDeId,
} from '../../compartilhado/dominio/gerador-de-id';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { Servico } from '../entities/servico';
import { SERVICO_REPOSITORY, ServicoRepository } from './servico.repositorio';

/**
 * Casos de uso do catálogo de serviços. É um CRUD coeso, então agrupamos os
 * casos de uso numa única classe (Aula 4 permite o agrupamento por regra
 * coerente) — cada método continua resolvendo apenas um caso de uso. O
 * repositório entra por Inversão de Dependência, o que mantém a classe testável
 * com um mock (sem banco).
 */
@Injectable()
export class ServicoUseCases {
  constructor(
    @Inject(SERVICO_REPOSITORY)
    private readonly servicos: ServicoRepository,
    @Inject(GERADOR_DE_ID)
    private readonly ids: GeradorDeId,
  ) {}

  async cadastrar(entrada: {
    nome: string;
    descricao?: string | null;
    precoBase: number;
  }): Promise<Servico> {
    const servico = Servico.criar({ id: this.ids.novo(), ...entrada });
    await this.servicos.inserir(servico);
    return servico;
  }

  async atualizar(entrada: {
    id: string;
    nome?: string;
    descricao?: string | null;
    precoBase?: number;
  }): Promise<Servico> {
    const servico = await this.buscarAtivoOuFalhar(entrada.id);
    servico.atualizarDados(entrada);
    await this.servicos.salvar(servico);
    return servico;
  }

  async remover(id: string): Promise<void> {
    const servico = await this.buscarAtivoOuFalhar(id);
    servico.inativar();
    await this.servicos.salvar(servico);
  }

  async listar(): Promise<Servico[]> {
    return this.servicos.listar();
  }

  async buscar(id: string): Promise<Servico> {
    const servico = await this.servicos.buscarPorId(id);
    if (!servico) {
      throw new ErroNaoEncontrado('Serviço não encontrado.', { id });
    }
    return servico;
  }

  private async buscarAtivoOuFalhar(id: string): Promise<Servico> {
    const servico = await this.servicos.buscarPorId(id);
    if (!servico || !servico.ativo) {
      throw new ErroNaoEncontrado('Serviço não encontrado.', { id });
    }
    return servico;
  }
}
