import { AgregadoRaiz } from '../../compartilhado/dominio/agregado-raiz';
import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';

interface PropsPeca {
  codigo: string;
  nome: string;
  precoUnitario: number;
  saldoFisico: number;
  reservado: number;
  ativo: boolean;
}

/**
 * Raiz de agregado Peça (Estoque). Invariante central:
 *   disponivel = saldoFisico - reservado
 * e nunca se reserva acima do disponível. Na Fase 4 usamos só leitura
 * (disponível) e cotação; reservar/baixar entram nas Fases 5 e 6.
 */
export class Peca extends AgregadoRaiz<string> {
  private constructor(
    id: string,
    private props: PropsPeca,
  ) {
    super(id);
  }

  static criar(entrada: {
    id: string;
    codigo: string;
    nome: string;
    precoUnitario: number;
    saldoFisico?: number;
  }): Peca {
    if (!entrada.codigo?.trim()) {
      throw new ErroValidacao('Código da peça é obrigatório.');
    }
    if (!entrada.nome?.trim()) {
      throw new ErroValidacao('Nome da peça é obrigatório.');
    }
    if (entrada.precoUnitario < 0) {
      throw new ErroValidacao('Preço unitário não pode ser negativo.');
    }
    return new Peca(entrada.id, {
      codigo: entrada.codigo.trim(),
      nome: entrada.nome.trim(),
      precoUnitario: entrada.precoUnitario,
      saldoFisico: entrada.saldoFisico ?? 0,
      reservado: 0,
      ativo: true,
    });
  }

  static restaurar(id: string, props: PropsPeca): Peca {
    return new Peca(id, props);
  }

  /** Quantidade livre para novas reservas. */
  get disponivel(): number {
    return this.props.saldoFisico - this.props.reservado;
  }

  /** Há disponível suficiente para a quantidade pedida? (somente leitura) */
  temDisponivel(quantidade: number): boolean {
    return this.disponivel >= quantidade;
  }

  get codigo(): string {
    return this.props.codigo;
  }
  get nome(): string {
    return this.props.nome;
  }
  get precoUnitario(): number {
    return this.props.precoUnitario;
  }
  get saldoFisico(): number {
    return this.props.saldoFisico;
  }
  get reservado(): number {
    return this.props.reservado;
  }
  get ativo(): boolean {
    return this.props.ativo;
  }
}
