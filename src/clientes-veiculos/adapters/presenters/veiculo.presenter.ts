import { Veiculo } from '../../entities/veiculo';
import { VeiculoRespostaDto } from '../dtos';

export function apresentarVeiculo(veiculo: Veiculo): VeiculoRespostaDto {
  return {
    id: veiculo.id,
    clienteId: veiculo.clienteId,
    placa: veiculo.placa.valor,
    marca: veiculo.marca,
    modelo: veiculo.modelo,
    ano: veiculo.ano,
    ativo: veiculo.ativo,
  };
}
