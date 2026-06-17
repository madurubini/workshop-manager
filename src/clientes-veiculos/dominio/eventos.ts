import { EventoDominio } from '../../compartilhado/dominio/evento-dominio';

/** Cliente criado no sistema (CMD "Cadastrar cliente"). */
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

/** Veículo criado e vinculado a um cliente (EV "Veículo registrado"). */
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
