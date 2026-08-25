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
  listarReservadasDaOrdem(ordemId: string): Promise<DadosReserva[]>;
  marcarBaixadasDaOrdem(ordemId: string): Promise<void>;
}
