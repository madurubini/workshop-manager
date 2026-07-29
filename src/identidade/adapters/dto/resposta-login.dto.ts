import { ApiProperty } from '@nestjs/swagger';

export class RespostaLoginDto {
  @ApiProperty({
    description: 'Token JWT Bearer para as rotas administrativas',
  })
  accessToken!: string;

  @ApiProperty({ example: 3600, description: 'Validade do token em segundos' })
  expiresIn!: number;
}
