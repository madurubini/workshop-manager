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
  /** Reservas RESERVADA de uma OS (usado na baixa). */
  listarReservadasDaOrdem(ordemId: string): Promise<DadosReserva[]>;
  /** Marca como BAIXADA todas as reservas RESERVADA de uma OS. */
  marcarBaixadasDaOrdem(ordemId: string): Promise<void>;
}
