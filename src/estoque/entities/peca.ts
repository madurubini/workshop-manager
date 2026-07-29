import { AgregadoRaiz } from '../../compartilhado/dominio/agregado-raiz';
import {
  ErroConflito,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';

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

  atualizarDados(entrada: { nome?: string; precoUnitario?: number }): void {
    if (entrada.nome !== undefined) {
      if (!entrada.nome.trim()) {
        throw new ErroValidacao('Nome da peça não pode ser vazio.');
      }
      this.props.nome = entrada.nome.trim();
    }
    if (entrada.precoUnitario !== undefined) {
      if (entrada.precoUnitario < 0) {
        throw new ErroValidacao('Preço unitário não pode ser negativo.');
      }
      this.props.precoUnitario = entrada.precoUnitario;
    }
  }

  /**
   * Ajuste manual de saldo físico (entrada/saída). Uma saída não pode derrubar
   * o saldo abaixo do que já está reservado (manteria o disponível negativo).
   */
  ajustarSaldo(tipo: 'ENTRADA' | 'SAIDA', quantidade: number): void {
    if (quantidade <= 0) {
      throw new ErroValidacao('Quantidade do ajuste deve ser positiva.');
    }
    if (tipo === 'ENTRADA') {
      this.props.saldoFisico += quantidade;
      return;
    }
    const novoSaldo = this.props.saldoFisico - quantidade;
    if (novoSaldo < this.props.reservado) {
      throw new ErroConflito('Saída deixaria o saldo abaixo do reservado.', {
        pecaId: this.id,
        saldoFisico: this.props.saldoFisico,
        reservado: this.props.reservado,
        quantidade,
      });
    }
    this.props.saldoFisico = novoSaldo;
  }

  inativar(): void {
    this.props.ativo = false;
  }

  /** Quantidade livre para novas reservas. */
  get disponivel(): number {
    return this.props.saldoFisico - this.props.reservado;
  }

  /** Há disponível suficiente para a quantidade pedida? (somente leitura) */
  temDisponivel(quantidade: number): boolean {
    return this.disponivel >= quantidade;
  }

  /**
   * Reserva uma quantidade para uma OS. Invariante: nunca reservar acima do
   * disponível. Aumenta o "reservado" (o saldo físico só cai na baixa).
   */
  reservar(quantidade: number): void {
    if (quantidade <= 0) {
      throw new ErroValidacao('Quantidade a reservar deve ser positiva.');
    }
    if (quantidade > this.disponivel) {
      throw new ErroConflito('Não é possível reservar acima do disponível.', {
        pecaId: this.id,
        solicitado: quantidade,
        disponivel: this.disponivel,
      });
    }
    this.props.reservado += quantidade;
  }

  /**
   * Baixa peças efetivamente retiradas (Fase 6): só do que está reservado.
   * Reduz tanto o reservado quanto o saldo físico.
   */
  baixar(quantidade: number): void {
    if (quantidade <= 0) {
      throw new ErroValidacao('Quantidade a baixar deve ser positiva.');
    }
    if (quantidade > this.props.reservado) {
      throw new ErroConflito('Não é possível baixar mais do que o reservado.', {
        pecaId: this.id,
        solicitado: quantidade,
        reservado: this.props.reservado,
      });
    }
    this.props.reservado -= quantidade;
    this.props.saldoFisico -= quantidade;
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
