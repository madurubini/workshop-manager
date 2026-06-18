import { Servico } from './servico';

export const SERVICO_REPOSITORY = Symbol('ServicoRepository');

export interface ServicoRepository {
  inserir(servico: Servico): Promise<void>;
  salvar(servico: Servico): Promise<void>;
  buscarPorId(id: string): Promise<Servico | null>;
  listar(): Promise<Servico[]>;
}
