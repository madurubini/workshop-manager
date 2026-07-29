import { Cliente } from '../entities/cliente';

/**
 * Contrato de persistência (Gateway) do agregado Cliente — output boundary
 * exigido pelos casos de uso. Implementação Prisma em `adapters/gateways`.
 */
export const CLIENTE_REPOSITORY = Symbol('ClienteRepository');

export interface ClienteRepository {
  inserir(cliente: Cliente): Promise<void>;
  salvar(cliente: Cliente): Promise<void>;
  buscarPorId(id: string): Promise<Cliente | null>;
  buscarPorDocumento(documento: string): Promise<Cliente | null>;
  listar(): Promise<Cliente[]>;
}
