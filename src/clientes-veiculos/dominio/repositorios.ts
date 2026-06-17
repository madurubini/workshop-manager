import { Cliente } from './cliente';
import { Veiculo } from './veiculo';

/** Portas de persistência do agregado Clientes e Veículos. */

export const CLIENTE_REPOSITORY = Symbol('ClienteRepository');

export interface ClienteRepository {
  inserir(cliente: Cliente): Promise<void>;
  buscarPorId(id: string): Promise<Cliente | null>;
  buscarPorDocumento(documento: string): Promise<Cliente | null>;
  listar(): Promise<Cliente[]>;
}

export const VEICULO_REPOSITORY = Symbol('VeiculoRepository');

export interface VeiculoRepository {
  inserir(veiculo: Veiculo): Promise<void>;
  buscarPorId(id: string): Promise<Veiculo | null>;
  buscarPorPlaca(placa: string): Promise<Veiculo | null>;
  listarPorCliente(clienteId: string): Promise<Veiculo[]>;
}
