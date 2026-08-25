import { Peca } from '../entities/peca';

export const PECA_REPOSITORY = Symbol('PecaRepository');

export interface PecaRepository {
  inserir(peca: Peca): Promise<void>;
  salvar(peca: Peca): Promise<void>;
  buscarPorId(id: string): Promise<Peca | null>;
  buscarPorCodigo(codigo: string): Promise<Peca | null>;
  listar(): Promise<Peca[]>;
  /**
   * UPDATE condicional: incrementa `reservado` só se houver disponível e grava
   * a reserva na mesma transação; `false` se perdeu a corrida. Checagem e
   * escrita juntas no banco é o que impede dupla reserva sob concorrência.
   */
  reservarAtomico(entrada: {
    pecaId: string;
    ordemId: string;
    quantidade: number;
  }): Promise<boolean>;
}
