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
  /** Registra uma encomenda PENDENTE (peça em falta na aprovação do orçamento). */
  registrar(dados: {
    pecaId: string;
    ordemId: string;
    quantidade: number;
  }): Promise<void>;
  /** Encomendas PENDENTE de uma peça, em ordem de chegada (FIFO). */
  listarPendentesDaPeca(pecaId: string): Promise<DadosEncomenda[]>;
  /** Marca uma encomenda como RECEBIDA (atendida ao chegar a peça). */
  marcarRecebida(id: string): Promise<void>;
  /** Cancela as encomendas PENDENTE de uma OS (ex.: OS cancelada). */
  cancelarPendentesDaOrdem(ordemId: string): Promise<void>;
}
