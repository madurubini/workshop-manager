import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
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

export class OrdemServicoRespostaDto {
  @ApiProperty() id!: string;
  @ApiProperty() numero!: string;
  @ApiProperty() clienteId!: string;
  @ApiProperty() veiculoId!: string;
  @ApiProperty() problemaRelatado!: string;
  @ApiProperty({ example: 'Recebida' }) status!: string;
  @ApiProperty() versao!: number;
  @ApiProperty() pago!: boolean;
  @ApiProperty() criadoEm!: Date;
  @ApiProperty({ type: [HistoricoItemDto] }) historico!: HistoricoItemDto[];

  static de(ordem: OrdemServico): OrdemServicoRespostaDto {
    return {
      id: ordem.id,
      numero: ordem.numero,
      clienteId: ordem.clienteId,
      veiculoId: ordem.veiculoId,
      problemaRelatado: ordem.problemaRelatado,
      status: ROTULO_STATUS[ordem.status],
      versao: ordem.versao,
      pago: ordem.pago,
      criadoEm: ordem.criadoEm,
      historico: ordem.historico.map((h) => ({
        status: ROTULO_STATUS[h.status],
        em: h.em,
        por: h.por,
      })),
    };
  }
}
