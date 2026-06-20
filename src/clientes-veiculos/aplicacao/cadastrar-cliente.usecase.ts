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
    const novo = Cliente.cadastrar({
      id: randomUUID(),
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
}
