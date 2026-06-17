import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AutenticarUsuario } from '../aplicacao/autenticar-usuario.usecase';
import { LoginDto } from './dto/login.dto';
import { RespostaLoginDto } from './dto/resposta-login.dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly autenticarUsuario: AutenticarUsuario) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica um usuário administrativo e emite o JWT',
  })
  @ApiResponse({ status: 200, type: RespostaLoginDto })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  async login(@Body() dto: LoginDto): Promise<RespostaLoginDto> {
    return this.autenticarUsuario.executar({
      username: dto.username,
      senha: dto.senha,
    });
  }
}
