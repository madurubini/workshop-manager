import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../compartilhado/infraestrutura/prisma/prisma.service';
import { Papel, Usuario } from '../../entities/usuario';
import { UsuarioRepository } from '../../use-cases/usuario.repositorio';

@Injectable()
export class PrismaUsuarioRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorUsername(username: string): Promise<Usuario | null> {
    const registro = await this.prisma.usuario.findUnique({
      where: { username },
    });
    if (!registro) {
      return null;
    }
    return {
      id: registro.id,
      username: registro.username,
      senhaHash: registro.senhaHash,
      papel: registro.papel as Papel,
      ativo: registro.ativo,
    };
  }

  async inserir(usuario: Usuario): Promise<void> {
    await this.prisma.usuario.create({
      data: {
        id: usuario.id,
        username: usuario.username,
        senhaHash: usuario.senhaHash,
        papel: usuario.papel,
        ativo: usuario.ativo,
      },
    });
  }
}
