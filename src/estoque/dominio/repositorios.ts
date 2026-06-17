import { Peca } from './peca';

export const PECA_REPOSITORY = Symbol('PecaRepository');

export interface PecaRepository {
  inserir(peca: Peca): Promise<void>;
  buscarPorId(id: string): Promise<Peca | null>;
  buscarPorCodigo(codigo: string): Promise<Peca | null>;
  listar(): Promise<Peca[]>;
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
