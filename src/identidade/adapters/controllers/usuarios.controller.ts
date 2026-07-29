import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CadastrarUsuario } from '../../use-cases/cadastrar-usuario.usecase';
import {
  CadastrarUsuarioDto,
  UsuarioCriadoDto,
} from '../dto/cadastrar-usuario.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Papeis } from '../decorators/papeis.decorator';
import { PapeisGuard } from '../guards/papeis.guard';

/**
 * Cadastro de usuários administrativos. Rota protegida e restrita ao GESTOR:
 * só quem é gestor pode criar novos operadores (recepcionista, mecânico ou
 * outro gestor). A senha nunca trafega de volta — só o hash é persistido.
 */
@ApiTags('Usuários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PapeisGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly cadastrarUsuario: CadastrarUsuario) {}

  @Post()
  @Papeis('GESTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastra um usuário administrativo (GESTOR apenas)',
  })
  @ApiResponse({ status: 201, type: UsuarioCriadoDto })
  @ApiForbiddenResponse({
    description: 'Apenas GESTOR pode cadastrar usuários',
  })
  async cadastrar(@Body() dto: CadastrarUsuarioDto): Promise<UsuarioCriadoDto> {
    return this.cadastrarUsuario.executar({
      username: dto.username,
      senha: dto.senha,
      papel: dto.papel,
    });
  }
}
