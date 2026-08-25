import { EventoDominio } from '../../compartilhado/dominio/evento-dominio';

export class ClienteCadastrado extends EventoDominio {
  constructor(
    readonly clienteId: string,
    readonly documento: string,
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'clientes-veiculos.cliente-cadastrado';
  }
}

export class VeiculoRegistrado extends EventoDominio {
  constructor(
    readonly veiculoId: string,
    readonly clienteId: string,
    readonly placa: string,
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'clientes-veiculos.veiculo-registrado';
  }
}
