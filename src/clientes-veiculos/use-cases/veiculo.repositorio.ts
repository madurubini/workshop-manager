import { Veiculo } from '../entities/veiculo';

/**
 * Contrato de persistência (Gateway) do agregado Veículo — output boundary
 * exigido pelos casos de uso. Implementação Prisma em `adapters/gateways`.
 */
export const VEICULO_REPOSITORY = Symbol('VeiculoRepository');

export interface VeiculoRepository {
  inserir(veiculo: Veiculo): Promise<void>;
  salvar(veiculo: Veiculo): Promise<void>;
  buscarPorId(id: string): Promise<Veiculo | null>;
  buscarPorPlaca(placa: string): Promise<Veiculo | null>;
  listarPorCliente(clienteId: string): Promise<Veiculo[]>;
}
