import { Peca } from './peca';

export const PECA_REPOSITORY = Symbol('PecaRepository');

export interface PecaRepository {
  inserir(peca: Peca): Promise<void>;
  /** Persiste alterações de saldo/reserva de uma peça já existente. */
  salvar(peca: Peca): Promise<void>;
  buscarPorId(id: string): Promise<Peca | null>;
  buscarPorCodigo(codigo: string): Promise<Peca | null>;
  listar(): Promise<Peca[]>;
  /**
   * Reserva ATÔMICA: incrementa `reservado` SOMENTE se houver disponível
   * (`saldoFisico - reservado >= quantidade`) e grava a ReservaEstoque na MESMA
   * transação. Retorna `false` se não havia disponível (corrida perdida).
   *
   * É o que impede dupla reserva sob concorrência: a checagem e a escrita
   * acontecem juntas no banco (um UPDATE condicional), não em memória — então
   * duas reservas simultâneas da mesma peça não conseguem ambas passar.
   */
  reservarAtomico(entrada: {
    pecaId: string;
    ordemId: string;
    quantidade: number;
  }): Promise<boolean>;
}

export type StatusReserva = 'RESERVADA' | 'BAIXADA' | 'LIBERADA';

export interface DadosReserva {
  pecaId: string;
  ordemId: string;
  quantidade: number;
  status: StatusReserva;
}

export const RESERVA_REPOSITORY = Symbol('ReservaRepository');

export interface ReservaRepository {
  registrar(dados: DadosReserva): Promise<void>;
  /** Reservas RESERVADA de uma OS (usado na baixa, Fase 6). */
  listarReservadasDaOrdem(ordemId: string): Promise<DadosReserva[]>;
  /** Marca como BAIXADA todas as reservas RESERVADA de uma OS. */
  marcarBaixadasDaOrdem(ordemId: string): Promise<void>;
}

export interface DadosCotacao {
  ordemId: string;
  pecaId: string;
  preco: number;
  prazoDias: number;
  fornecedor: string | null;
}

export const COTACAO_REPOSITORY = Symbol('CotacaoRepository');

export interface CotacaoRepository {
  registrar(dados: DadosCotacao): Promise<void>;
}
