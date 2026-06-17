import { Peca } from './peca';

export const PECA_REPOSITORY = Symbol('PecaRepository');

export interface PecaRepository {
  inserir(peca: Peca): Promise<void>;
  /** Persiste alterações de saldo/reserva de uma peça já existente. */
  salvar(peca: Peca): Promise<void>;
  buscarPorId(id: string): Promise<Peca | null>;
  buscarPorCodigo(codigo: string): Promise<Peca | null>;
  listar(): Promise<Peca[]>;
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
