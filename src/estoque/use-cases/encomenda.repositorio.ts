export type StatusEncomenda = 'PENDENTE' | 'RECEBIDA' | 'CANCELADA';

export interface DadosEncomenda {
  id: string;
  pecaId: string;
  ordemId: string;
  quantidade: number;
  status: StatusEncomenda;
}

export const ENCOMENDA_REPOSITORY = Symbol('EncomendaRepository');

export interface EncomendaRepository {
  registrar(dados: {
    pecaId: string;
    ordemId: string;
    quantidade: number;
  }): Promise<void>;
  /** Em ordem de chegada (FIFO). */
  listarPendentesDaPeca(pecaId: string): Promise<DadosEncomenda[]>;
  marcarRecebida(id: string): Promise<void>;
  cancelarPendentesDaOrdem(ordemId: string): Promise<void>;
}
