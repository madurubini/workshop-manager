import { AgregadoRaiz } from '../../compartilhado/dominio/agregado-raiz';
import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';
import { Placa } from '../../compartilhado/dominio/value-objects/placa';
import { VeiculoRegistrado } from './eventos';

interface PropsVeiculo {
  clienteId: string;
  placa: Placa;
  marca: string;
  modelo: string;
  ano: number;
  ativo: boolean;
  criadoEm: Date;
}

const ANO_MINIMO = 1900;

/**
 * Raiz de agregado Veículo. Carro do cliente, identificado pela placa (VO).
 * Invariante: todo veículo pertence a exatamente um cliente (clienteId
 * obrigatório). Placa válida fica a cargo do value object Placa.
 */
export class Veiculo extends AgregadoRaiz<string> {
  private constructor(
    id: string,
    private props: PropsVeiculo,
  ) {
    super(id);
  }

  static registrar(entrada: {
    id: string;
    clienteId: string;
    placa: string;
    marca: string;
    modelo: string;
    ano: number;
  }): Veiculo {
    if (!entrada.clienteId) {
      throw new ErroValidacao('Veículo precisa pertencer a um cliente.');
    }
    if (!entrada.marca?.trim() || !entrada.modelo?.trim()) {
      throw new ErroValidacao('Marca e modelo do veículo são obrigatórios.');
    }
    const anoAtual = new Date().getFullYear();
    if (entrada.ano < ANO_MINIMO || entrada.ano > anoAtual + 1) {
      throw new ErroValidacao(
        `Ano do veículo deve estar entre ${ANO_MINIMO} e ${anoAtual + 1}.`,
      );
    }
    const placa = Placa.criar(entrada.placa);

    const veiculo = new Veiculo(entrada.id, {
      clienteId: entrada.clienteId,
      placa,
      marca: entrada.marca.trim(),
      modelo: entrada.modelo.trim(),
      ano: entrada.ano,
      ativo: true,
      criadoEm: new Date(),
    });
    veiculo.registrarEvento(
      new VeiculoRegistrado(veiculo.id, entrada.clienteId, placa.valor),
    );
    return veiculo;
  }

  static restaurar(
    id: string,
    props: {
      clienteId: string;
      placa: string;
      marca: string;
      modelo: string;
      ano: number;
      ativo: boolean;
      criadoEm: Date;
    },
  ): Veiculo {
    return new Veiculo(id, {
      clienteId: props.clienteId,
      placa: Placa.criar(props.placa),
      marca: props.marca,
      modelo: props.modelo,
      ano: props.ano,
      ativo: props.ativo,
      criadoEm: props.criadoEm,
    });
  }

  inativar(): void {
    this.props.ativo = false;
  }

  get clienteId(): string {
    return this.props.clienteId;
  }
  get placa(): Placa {
    return this.props.placa;
  }
  get marca(): string {
    return this.props.marca;
  }
  get modelo(): string {
    return this.props.modelo;
  }
  get ano(): number {
    return this.props.ano;
  }
  get ativo(): boolean {
    return this.props.ativo;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
}
