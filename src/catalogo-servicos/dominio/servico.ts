import { AgregadoRaiz } from '../../compartilhado/dominio/agregado-raiz';
import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';

interface PropsServico {
  nome: string;
  descricao: string | null;
  precoBase: number;
  ativo: boolean;
}

/**
 * Serviço do catálogo (contexto de suporte). Tipo de serviço oferecido com um
 * preço base. Esse preço base é a referência que o Orçamento CONGELA no
 * momento do diagnóstico — depois disso, mudar o catálogo não altera orçamentos
 * já gerados.
 */
export class Servico extends AgregadoRaiz<string> {
  private constructor(
    id: string,
    private props: PropsServico,
  ) {
    super(id);
  }

  static criar(entrada: {
    id: string;
    nome: string;
    descricao?: string | null;
    precoBase: number;
  }): Servico {
    if (!entrada.nome?.trim()) {
      throw new ErroValidacao('Nome do serviço é obrigatório.');
    }
    if (entrada.precoBase < 0) {
      throw new ErroValidacao('Preço base não pode ser negativo.');
    }
    return new Servico(entrada.id, {
      nome: entrada.nome.trim(),
      descricao: entrada.descricao ?? null,
      precoBase: entrada.precoBase,
      ativo: true,
    });
  }

  static restaurar(id: string, props: PropsServico): Servico {
    return new Servico(id, props);
  }

  atualizarDados(entrada: {
    nome?: string;
    descricao?: string | null;
    precoBase?: number;
  }): void {
    if (entrada.nome !== undefined) {
      if (!entrada.nome.trim()) {
        throw new ErroValidacao('Nome do serviço não pode ser vazio.');
      }
      this.props.nome = entrada.nome.trim();
    }
    if (entrada.descricao !== undefined) {
      this.props.descricao = entrada.descricao;
    }
    if (entrada.precoBase !== undefined) {
      if (entrada.precoBase < 0) {
        throw new ErroValidacao('Preço base não pode ser negativo.');
      }
      this.props.precoBase = entrada.precoBase;
    }
  }

  inativar(): void {
    this.props.ativo = false;
  }

  get nome(): string {
    return this.props.nome;
  }
  get descricao(): string | null {
    return this.props.descricao;
  }
  get precoBase(): number {
    return this.props.precoBase;
  }
  get ativo(): boolean {
    return this.props.ativo;
  }
}
