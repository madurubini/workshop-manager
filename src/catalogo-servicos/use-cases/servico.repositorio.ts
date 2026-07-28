import { Servico } from '../entities/servico';

/**
 * Contrato de persistência (Gateway) do agregado Servico. Em Clean Architecture
 * a interface é o *output boundary* que o caso de uso EXIGE — por isso vive na
 * camada de casos de uso, não na entidade (que não conhece persistência) nem
 * numa camada separada de "ports". A implementação concreta (Prisma) fica em
 * `adapters/gateways`.
 */
export const SERVICO_REPOSITORY = Symbol('ServicoRepository');

export interface ServicoRepository {
  inserir(servico: Servico): Promise<void>;
  salvar(servico: Servico): Promise<void>;
  buscarPorId(id: string): Promise<Servico | null>;
  listar(): Promise<Servico[]>;
}
