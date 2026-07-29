/**
 * Porta PÚBLICA do módulo Clientes e Veículos (open-host service).
 *
 * É o único ponto pelo qual outros módulos (ex.: ordem-servico) podem
 * consultar este contexto. Expõe só o que o exterior precisa saber —
 * nunca as entidades nem os repositórios internos. Como é uma consulta que
 * precisa de resposta síncrona e consistente, é uma porta (interface), não um
 * evento.
 */
export const CLIENTES_VEICULOS_API = Symbol('ClientesVeiculosApi');

export interface ClientesVeiculosApi {
  /** Existe um cliente ativo com este id? */
  clienteExiste(clienteId: string): Promise<boolean>;

  /** O veículo existe, está ativo e pertence ao cliente informado? */
  veiculoPertenceAoCliente(
    veiculoId: string,
    clienteId: string,
  ): Promise<boolean>;
}
