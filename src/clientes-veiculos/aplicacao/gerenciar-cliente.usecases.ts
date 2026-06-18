import { Inject, Injectable } from '@nestjs/common';
import { ErroNaoEncontrado } from '../../compartilhado/erros/erros-dominio';
import { Cliente } from '../dominio/cliente';
import { CLIENTE_REPOSITORY, ClienteRepository } from '../dominio/repositorios';

async function carregar(repo: ClienteRepository, id: string): Promise<Cliente> {
  const cliente = await repo.buscarPorId(id);
  if (!cliente || !cliente.ativo) {
    throw new ErroNaoEncontrado('Cliente não encontrado.', { id });
  }
  return cliente;
}

/** Atualiza dados de contato do cliente (documento é imutável). */
@Injectable()
export class AtualizarCliente {
  constructor(
    @Inject(CLIENTE_REPOSITORY)
    private readonly clientes: ClienteRepository,
  ) {}

  async executar(entrada: {
    id: string;
    nome?: string;
    email?: string | null;
    telefone?: string | null;
  }): Promise<Cliente> {
    const cliente = await carregar(this.clientes, entrada.id);
    cliente.atualizarDados(entrada);
    await this.clientes.salvar(cliente);
    return cliente;
  }
}

/** Remove o cliente via soft delete (ativo = false). */
@Injectable()
export class RemoverCliente {
  constructor(
    @Inject(CLIENTE_REPOSITORY)
    private readonly clientes: ClienteRepository,
  ) {}

  async executar(entrada: { id: string }): Promise<void> {
    const cliente = await carregar(this.clientes, entrada.id);
    cliente.inativar();
    await this.clientes.salvar(cliente);
  }
}
