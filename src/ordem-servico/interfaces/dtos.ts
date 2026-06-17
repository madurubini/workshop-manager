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
import { SituacaoItemPeca } from '../dominio/itens';
import { OrdemServico } from '../dominio/ordem-servico';
import { ROTULO_STATUS } from '../dominio/status-os';

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

class ItemServicoDto {
  @ApiProperty() servicoId!: string;
  @ApiProperty() descricao!: string;
  @ApiProperty() quantidade!: number;
  @ApiProperty() precoAplicado!: number;
}

class ItemPecaDto {
  @ApiProperty() pecaId!: string;
  @ApiProperty() descricao!: string;
  @ApiProperty() quantidade!: number;
  @ApiProperty() precoAplicado!: number;
  @ApiProperty({ enum: SituacaoItemPeca }) situacao!: SituacaoItemPeca;
}

class OrcamentoDto {
  @ApiProperty() id!: string;
  @ApiProperty() totalServicos!: number;
  @ApiProperty() totalPecas!: number;
  @ApiProperty() total!: number;
  @ApiProperty() status!: string;
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
  @ApiProperty({ type: [ItemServicoDto] }) itensServico!: ItemServicoDto[];
  @ApiProperty({ type: [ItemPecaDto] }) itensPeca!: ItemPecaDto[];
  @ApiProperty({ type: OrcamentoDto, nullable: true })
  orcamento!: OrcamentoDto | null;

  static de(ordem: OrdemServico): OrdemServicoRespostaDto {
    const o = ordem.orcamento;
    return {
      id: ordem.id,
      numero: ordem.numero,
      clienteId: ordem.clienteId,
      veiculoId: ordem.veiculoId,
      problemaRelatado: ordem.problemaRelatado,
      status: ROTULO_STATUS[ordem.status],
      versao: ordem.versao,
      pago: ordem.pago,
      pagoEm: ordem.pagoEm,
      criadoEm: ordem.criadoEm,
      historico: ordem.historico.map((h) => ({
        status: ROTULO_STATUS[h.status],
        em: h.em,
        por: h.por,
      })),
      itensServico: ordem.itensServico.map((i) => ({
        servicoId: i.servicoId,
        descricao: i.descricao,
        quantidade: i.quantidade,
        precoAplicado: i.precoAplicado,
      })),
      itensPeca: ordem.itensPeca.map((i) => ({
        pecaId: i.pecaId,
        descricao: i.descricao,
        quantidade: i.quantidade,
        precoAplicado: i.precoAplicado,
        situacao: i.situacao,
      })),
      orcamento: o
        ? {
            id: o.id,
            totalServicos: o.totalServicos,
            totalPecas: o.totalPecas,
            total: o.total,
            status: o.status,
          }
        : null,
    };
  }
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
  @ApiProperty({ enum: SituacaoItemPeca }) situacao!: SituacaoItemPeca;
}

/** Visão pública do cliente: status, orçamento e histórico (sem dados internos). */
export class AcompanhamentoRespostaDto {
  @ApiProperty() numero!: string;
  @ApiProperty() problemaRelatado!: string;
  @ApiProperty() status!: string;
  @ApiProperty() pago!: boolean;
  @ApiProperty({ type: OrcamentoDto, nullable: true })
  orcamento!: OrcamentoDto | null;
  @ApiProperty({ type: [HistoricoItemDto] }) historico!: HistoricoItemDto[];

  static de(ordem: OrdemServico): AcompanhamentoRespostaDto {
    const o = ordem.orcamento;
    return {
      numero: ordem.numero,
      problemaRelatado: ordem.problemaRelatado,
      status: ROTULO_STATUS[ordem.status],
      pago: ordem.pago,
      orcamento: o
        ? {
            id: o.id,
            totalServicos: o.totalServicos,
            totalPecas: o.totalPecas,
            total: o.total,
            status: o.status,
          }
        : null,
      historico: ordem.historico.map((h) => ({
        status: ROTULO_STATUS[h.status],
        em: h.em,
        por: h.por,
      })),
    };
  }
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

export class RegistrarReparoAdicionalDto {
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

export class RespostaReparoDto {
  @ApiProperty({ description: 'true autoriza, false recusa o reparo' })
  @IsBoolean()
  aprovado!: boolean;
}

export class PagamentoDto {
  @ApiProperty({ example: true, description: 'Confirma o pagamento manual' })
  @IsBoolean()
  pago!: boolean;
}

/** Resposta do diagnóstico no formato do contrato. */
export class DiagnosticoRespostaDto {
  @ApiProperty({ example: 'Em diagnóstico' }) status!: string;
  @ApiProperty({ type: OrcamentoDto }) orcamento!: OrcamentoDto;
  @ApiProperty({ type: [PendenciaEstoqueDto] })
  pendenciasEstoque!: PendenciaEstoqueDto[];

  static de(ordem: OrdemServico): DiagnosticoRespostaDto {
    const o = ordem.orcamento!;
    return {
      status: ROTULO_STATUS[ordem.status],
      orcamento: {
        id: o.id,
        totalServicos: o.totalServicos,
        totalPecas: o.totalPecas,
        total: o.total,
        status: o.status,
      },
      pendenciasEstoque: ordem.itensPeca
        .filter((i) => i.situacao !== SituacaoItemPeca.DISPONIVEL)
        .map((i) => ({ pecaId: i.pecaId, situacao: i.situacao })),
    };
  }
}
