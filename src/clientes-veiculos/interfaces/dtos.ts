import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Cliente } from '../dominio/cliente';
import { Veiculo } from '../dominio/veiculo';

export class CriarClienteDto {
  @ApiProperty({ example: '529.982.247-25', description: 'CPF ou CNPJ' })
  @IsString()
  @IsNotEmpty()
  documento!: string;

  @ApiProperty({ example: 'Maria Oliveira' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiPropertyOptional({ example: 'maria@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '11999998888' })
  @IsOptional()
  @IsString()
  telefone?: string;
}

export class CriarVeiculoDto {
  @ApiProperty({
    example: 'ABC1D23',
    description: 'Placa (antiga ou Mercosul)',
  })
  @IsString()
  @IsNotEmpty()
  placa!: string;

  @ApiProperty({ example: 'Volkswagen' })
  @IsString()
  @IsNotEmpty()
  marca!: string;

  @ApiProperty({ example: 'Gol' })
  @IsString()
  @IsNotEmpty()
  modelo!: string;

  @ApiProperty({ example: 2020 })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  ano!: number;
}

export class AtualizarClienteDto {
  @ApiPropertyOptional({ example: 'Maria Oliveira' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nome?: string;

  @ApiPropertyOptional({ example: 'maria@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '11999998888' })
  @IsOptional()
  @IsString()
  telefone?: string;
}

export class AtualizarVeiculoDto {
  @ApiPropertyOptional({ example: 'Volkswagen' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  marca?: string;

  @ApiPropertyOptional({ example: 'Gol' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  modelo?: string;

  @ApiPropertyOptional({ example: 2020 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  ano?: number;
}

export class ClienteRespostaDto {
  @ApiProperty() id!: string;
  @ApiProperty() tipoDocumento!: string;
  @ApiProperty() documento!: string;
  @ApiProperty() nome!: string;
  @ApiPropertyOptional() email!: string | null;
  @ApiPropertyOptional() telefone!: string | null;
  @ApiProperty() ativo!: boolean;

  static de(cliente: Cliente): ClienteRespostaDto {
    return {
      id: cliente.id,
      tipoDocumento: cliente.documento.tipo,
      documento: cliente.documento.formatado,
      nome: cliente.nome,
      email: cliente.email,
      telefone: cliente.telefone,
      ativo: cliente.ativo,
    };
  }
}

export class VeiculoRespostaDto {
  @ApiProperty() id!: string;
  @ApiProperty() clienteId!: string;
  @ApiProperty() placa!: string;
  @ApiProperty() marca!: string;
  @ApiProperty() modelo!: string;
  @ApiProperty() ano!: number;
  @ApiProperty() ativo!: boolean;

  static de(veiculo: Veiculo): VeiculoRespostaDto {
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
}
