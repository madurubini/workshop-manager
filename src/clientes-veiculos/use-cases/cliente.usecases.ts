import { Inject, Injectable } from '@nestjs/common';
import {
  GERADOR_DE_ID,
  GeradorDeId,
} from '../../compartilhado/dominio/gerador-de-id';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
import {
  ErroConflito,
  ErroNaoEncontrado,
} from '../../compartilhado/erros/erros-dominio';
import { Cliente } from '../entities/cliente';
import { CLIENTE_REPOSITORY, ClienteRepository } from './cliente.repositorio';

export interface EntradaCadastrarCliente {
  documento: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
}

export interface EntradaAtualizarCliente {
  id: string;
  nome?: string;
  email?: string | null;
  telefone?: string | null;
}

/**
 * Casos de uso do agregado Cliente (CRUD coeso). As validações de documento
 * moram no VO Documento (chamado pela raiz Cliente); aqui ficam as regras que
 * cruzam o repositório (unicidade do documento, recadastro) e a publicação de
 * eventos após persistir.
 */
@Injectable()
export class ClienteUseCases {
  constructor(
    @Inject(CLIENTE_REPOSITORY)
    private readonly clientes: ClienteRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
    @Inject(GERADOR_DE_ID)
    private readonly ids: GeradorDeId,
  ) {}

  async cadastrar(entrada: EntradaCadastrarCliente): Promise<Cliente> {
    // A raiz valida o documento (formato + dígitos) ao construir.
    const novo = Cliente.cadastrar({
      id: this.ids.novo(),
      documento: entrada.documento,
      nome: entrada.nome,
      email: entrada.email,
      telefone: entrada.telefone,
    });

    const existente = await this.clientes.buscarPorDocumento(
      novo.documento.valor,
    );
    if (existente) {
      // CPF/CNPJ de cliente ATIVO → duplicata real (409).
      if (existente.ativo) {
        throw new ErroConflito('Já existe um cliente com este documento.', {
          documento: novo.documento.formatado,
        });
      }
      // CPF/CNPJ de cliente INATIVO → recadastro: reativa a linha existente
      // (o documento é único; não criamos uma nova).
      existente.reativar({
        nome: entrada.nome,
        email: entrada.email,
        telefone: entrada.telefone,
      });
      await this.clientes.salvar(existente);
      await this.eventos.publicar(...existente.puxarEventos());
      return existente;
    }

    await this.clientes.inserir(novo);
    await this.eventos.publicar(...novo.puxarEventos());
    return novo;
  }

  async atualizar(entrada: EntradaAtualizarCliente): Promise<Cliente> {
    const cliente = await this.buscarAtivoOuFalhar(entrada.id);
    cliente.atualizarDados(entrada);
    await this.clientes.salvar(cliente);
    return cliente;
  }

  async remover(id: string): Promise<void> {
    const cliente = await this.buscarAtivoOuFalhar(id);
    cliente.inativar();
    await this.clientes.salvar(cliente);
  }

  async listar(): Promise<Cliente[]> {
    return this.clientes.listar();
  }

  async buscar(id: string): Promise<Cliente> {
    const cliente = await this.clientes.buscarPorId(id);
    if (!cliente) {
      throw new ErroNaoEncontrado('Cliente não encontrado.', { id });
    }
    return cliente;
  }

  private async buscarAtivoOuFalhar(id: string): Promise<Cliente> {
    const cliente = await this.clientes.buscarPorId(id);
    if (!cliente || !cliente.ativo) {
      throw new ErroNaoEncontrado('Cliente não encontrado.', { id });
    }
    return cliente;
  }
}
