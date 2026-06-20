import { AgregadoRaiz } from '../../compartilhado/dominio/agregado-raiz';
import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';
import { Documento } from '../../compartilhado/dominio/value-objects/documento';
import { ClienteCadastrado } from './eventos';

interface PropsCliente {
  documento: Documento;
  nome: string;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  criadoEm: Date;
}

/**
 * Raiz de agregado Cliente. Pessoa física ou jurídica identificada pelo
 * documento (CPF/CNPJ). As invariantes de documento válido moram no value
 * object Documento; aqui garantimos o restante (nome obrigatório) e o ciclo
 * de vida (soft delete via `ativo`).
 */
export class Cliente extends AgregadoRaiz<string> {
  private constructor(
    id: string,
    private props: PropsCliente,
  ) {
    super(id);
  }

  /** Cadastra um novo cliente (gera o evento ClienteCadastrado). */
  static cadastrar(entrada: {
    id: string;
    documento: string;
    nome: string;
    email?: string | null;
    telefone?: string | null;
  }): Cliente {
    if (!entrada.nome || !entrada.nome.trim()) {
      throw new ErroValidacao('Nome do cliente é obrigatório.');
    }
    const documento = Documento.criar(entrada.documento);

    const cliente = new Cliente(entrada.id, {
      documento,
      nome: entrada.nome.trim(),
      email: entrada.email ?? null,
      telefone: entrada.telefone ?? null,
      ativo: true,
      criadoEm: new Date(),
    });
    cliente.registrarEvento(new ClienteCadastrado(cliente.id, documento.valor));
    return cliente;
  }

  /** Reconstrói o cliente a partir do que já está persistido (sem eventos). */
  static restaurar(
    id: string,
    props: {
      documento: string;
      nome: string;
      email: string | null;
      telefone: string | null;
      ativo: boolean;
      criadoEm: Date;
    },
  ): Cliente {
    return new Cliente(id, {
      documento: Documento.criar(props.documento),
      nome: props.nome,
      email: props.email,
      telefone: props.telefone,
      ativo: props.ativo,
      criadoEm: props.criadoEm,
    });
  }

  /** Atualiza dados de contato. O documento é imutável (é a identidade). */
  atualizarDados(entrada: {
    nome?: string;
    email?: string | null;
    telefone?: string | null;
  }): void {
    if (entrada.nome !== undefined) {
      if (!entrada.nome.trim()) {
        throw new ErroValidacao('Nome do cliente não pode ser vazio.');
      }
      this.props.nome = entrada.nome.trim();
    }
    if (entrada.email !== undefined) {
      this.props.email = entrada.email;
    }
    if (entrada.telefone !== undefined) {
      this.props.telefone = entrada.telefone;
    }
  }

  /** Soft delete: inativa o cliente sem apagar o registro. */
  inativar(): void {
    this.props.ativo = false;
  }

  /**
   * Reativa um cliente que estava inativo (recadastro). O documento é a
   * identidade e tem índice único — então recadastrar o mesmo CPF/CNPJ não cria
   * uma linha nova: reativa a existente com os dados informados.
   */
  reativar(entrada: {
    nome?: string;
    email?: string | null;
    telefone?: string | null;
  }): void {
    this.props.ativo = true;
    this.atualizarDados(entrada);
    this.registrarEvento(
      new ClienteCadastrado(this.id, this.props.documento.valor),
    );
  }

  get documento(): Documento {
    return this.props.documento;
  }
  get nome(): string {
    return this.props.nome;
  }
  get email(): string | null {
    return this.props.email;
  }
  get telefone(): string | null {
    return this.props.telefone;
  }
  get ativo(): boolean {
    return this.props.ativo;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
}
