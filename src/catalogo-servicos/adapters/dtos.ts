import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CriarServicoDto {
  @ApiProperty({ example: 'Troca de óleo' })
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @ApiPropertyOptional({ example: 'Inclui filtro' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ example: 120.0 })
  @IsNumber()
  @Min(0)
  precoBase!: number;
}

export class AtualizarServicoDto {
  @ApiPropertyOptional({ example: 'Troca de óleo sintético' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ example: 150.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precoBase?: number;
}

export class ServicoRespostaDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiPropertyOptional() descricao!: string | null;
  @ApiProperty() precoBase!: number;
  @ApiProperty() ativo!: boolean;
}
