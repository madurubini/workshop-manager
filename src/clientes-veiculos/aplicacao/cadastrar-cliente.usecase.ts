import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PUBLICADOR_DE_EVENTOS,
  PublicadorDeEventos,
} from '../../compartilhado/dominio/publicador-de-eventos';
import { ErroConflito } from '../../compartilhado/erros/erros-dominio';
import { Cliente } from '../dominio/cliente';
import { CLIENTE_REPOSITORY, ClienteRepository } from '../dominio/repositorios';

export interface EntradaCadastrarCliente {
  documento: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
}

/**
 * Caso de uso: cadastrar um cliente. As validações de documento moram no VO
 * (chamado pela raiz Cliente); aqui garantimos a unicidade do documento
 * (invariante do agregado) e publicamos os eventos após persistir.
 */
@Injectable()
export class CadastrarCliente {
  constructor(
    @Inject(CLIENTE_REPOSITORY)
    private readonly clientes: ClienteRepository,
    @Inject(PUBLICADOR_DE_EVENTOS)
    private readonly eventos: PublicadorDeEventos,
  ) {}

  async executar(entrada: EntradaCadastrarCliente): Promise<Cliente> {
    // A raiz valida o documento (formato + dígitos) ao construir.
    const cliente = Cliente.cadastrar({
      id: randomUUID(),
      documento: entrada.documento,
      nome: entrada.nome,
      email: entrada.email,
      telefone: entrada.telefone,
    });

    const jaExiste = await this.clientes.buscarPorDocumento(
      cliente.documento.valor,
    );
    if (jaExiste) {
      throw new ErroConflito('Já existe um cliente com este documento.', {
        documento: cliente.documento.formatado,
      });
    }

    await this.clientes.inserir(cliente);
    this.eventos.publicar(...cliente.puxarEventos());
    return cliente;
  }
}
