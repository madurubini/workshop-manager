import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { SituacaoPecaOrcada } from '../entities/itens';

export class AbrirOrdemServicoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clienteId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  veiculoId!: string;

  @ApiProperty({
    example: 'Barulho na suspensão dianteira ao passar em buracos.',
  })
  @IsString()
  @IsNotEmpty()
  problemaRelatado!: string;
}

class HistoricoItemDto {
  @ApiProperty() status!: string;
  @ApiProperty() em!: Date;
  @ApiProperty({ nullable: true }) por!: string | null;
}

class ServicoOrcadoDto {
  @ApiProperty() servicoId!: string;
  @ApiProperty() descricao!: string;
  @ApiProperty() quantidade!: number;
  @ApiProperty() precoAplicado!: number;
}

class PecaOrcadaDto {
  @ApiProperty() pecaId!: string;
  @ApiProperty() descricao!: string;
  @ApiProperty() quantidade!: number;
  @ApiProperty() precoAplicado!: number;
  @ApiProperty({ enum: SituacaoPecaOrcada }) situacao!: SituacaoPecaOrcada;
}

export class OrcamentoDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INICIAL' }) tipo!: string;
  @ApiProperty({ nullable: true }) descricao!: string | null;
  @ApiProperty() totalServicos!: number;
  @ApiProperty() totalPecas!: number;
  @ApiProperty() total!: number;
  @ApiProperty() status!: string;
  @ApiProperty({ type: [ServicoOrcadoDto] }) servicos!: ServicoOrcadoDto[];
  @ApiProperty({ type: [PecaOrcadaDto] }) pecas!: PecaOrcadaDto[];
}

export class OrdemServicoRespostaDto {
  @ApiProperty() id!: string;
  @ApiProperty() numero!: string;
  @ApiProperty() clienteId!: string;
  @ApiProperty() veiculoId!: string;
  @ApiProperty() problemaRelatado!: string;
  @ApiProperty({ example: 'Recebida' }) status!: string;
  @ApiProperty() versao!: number;
  @ApiProperty() pago!: boolean;
  @ApiProperty({ nullable: true }) pagoEm!: Date | null;
  @ApiProperty() criadoEm!: Date;
  @ApiProperty({ type: [HistoricoItemDto] }) historico!: HistoricoItemDto[];
  @ApiProperty({ type: [OrcamentoDto] }) orcamentos!: OrcamentoDto[];
}

class ItemServicoEntradaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  servicoId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantidade!: number;
}

class ItemPecaEntradaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  pecaId!: string;

  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  quantidade!: number;
}

export class RegistrarDiagnosticoDto {
  @ApiProperty({ type: [ItemServicoEntradaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemServicoEntradaDto)
  servicos!: ItemServicoEntradaDto[];

  @ApiProperty({ type: [ItemPecaEntradaDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPecaEntradaDto)
  pecas?: ItemPecaEntradaDto[];
}

class PendenciaEstoqueDto {
  @ApiProperty() pecaId!: string;
  @ApiProperty({ enum: SituacaoPecaOrcada }) situacao!: SituacaoPecaOrcada;
}

/** Visão pública do cliente: status, orçamentos e histórico (sem dados internos). */
export class AcompanhamentoRespostaDto {
  @ApiProperty() numero!: string;
  @ApiProperty() problemaRelatado!: string;
  @ApiProperty() status!: string;
  @ApiProperty() pago!: boolean;
  @ApiProperty({ type: [OrcamentoDto] }) orcamentos!: OrcamentoDto[];
  @ApiProperty({ type: [HistoricoItemDto] }) historico!: HistoricoItemDto[];
}

export class RespostaOrcamentoDto {
  @ApiProperty({ description: 'true aprova, false recusa o orçamento' })
  @IsBoolean()
  aprovado!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  justificativa?: string;
}

export class LancarOrcamentoAdicionalDto {
  @ApiProperty({ example: 'Troca da correia dentada (desgaste detectado)' })
  @IsString()
  @IsNotEmpty()
  descricao!: string;

  @ApiProperty({ type: [ItemServicoEntradaDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemServicoEntradaDto)
  servicos?: ItemServicoEntradaDto[];

  @ApiProperty({ type: [ItemPecaEntradaDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPecaEntradaDto)
  pecas?: ItemPecaEntradaDto[];
}

export class PagamentoDto {
  @ApiProperty({ example: true, description: 'Confirma o pagamento manual' })
  @IsBoolean()
  pago!: boolean;
}

/** Resposta do diagnóstico no formato do contrato (usa o orçamento inicial). */
export class DiagnosticoRespostaDto {
  @ApiProperty({ example: 'Em diagnóstico' }) status!: string;
  @ApiProperty({ type: OrcamentoDto }) orcamento!: OrcamentoDto;
  @ApiProperty({ type: [PendenciaEstoqueDto] })
  pendenciasEstoque!: PendenciaEstoqueDto[];
}
