import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Peca } from '../dominio/peca';

export class CriarPecaDto {
  @ApiProperty({ example: 'FILTRO-OLEO' })
  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @ApiProperty({ example: 'Filtro de óleo' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiProperty({ example: 35.0 })
  @IsNumber()
  @Min(0)
  precoUnitario!: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  saldoFisico?: number;
}

export class AtualizarPecaDto {
  @ApiPropertyOptional({ example: 'Filtro de óleo premium' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nome?: string;

  @ApiPropertyOptional({ example: 40.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precoUnitario?: number;
}

export class AjusteEstoqueDto {
  @ApiProperty({ enum: ['ENTRADA', 'SAIDA'] })
  @IsEnum(['ENTRADA', 'SAIDA'])
  tipo!: 'ENTRADA' | 'SAIDA';

  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt()
  @Min(1)
  quantidade!: number;

  @ApiPropertyOptional({ example: 'Recebimento de compra' })
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class PecaRespostaDto {
  @ApiProperty() id!: string;
  @ApiProperty() codigo!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() precoUnitario!: number;
  @ApiProperty() saldoFisico!: number;
  @ApiProperty() reservado!: number;
  @ApiProperty({ description: 'saldoFisico - reservado' }) disponivel!: number;
  @ApiProperty() ativo!: boolean;

  static de(peca: Peca): PecaRespostaDto {
    return {
      id: peca.id,
      codigo: peca.codigo,
      nome: peca.nome,
      precoUnitario: peca.precoUnitario,
      saldoFisico: peca.saldoFisico,
      reservado: peca.reservado,
      disponivel: peca.disponivel,
      ativo: peca.ativo,
    };
  }
}
