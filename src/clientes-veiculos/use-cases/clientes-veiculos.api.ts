/** Único ponto por onde outros módulos consultam este contexto. */
export const CLIENTES_VEICULOS_API = Symbol('ClientesVeiculosApi');

export interface ClientesVeiculosApi {
  clienteExiste(clienteId: string): Promise<boolean>;

  veiculoPertenceAoCliente(
    veiculoId: string,
    clienteId: string,
  ): Promise<boolean>;
}
