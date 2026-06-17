import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'gestor',
    description: 'Nome de usuário administrativo',
  })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'gestor123', description: 'Senha do usuário' })
  @IsString()
  @IsNotEmpty()
  senha!: string;
}
