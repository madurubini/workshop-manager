import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../compartilhado/infraestrutura/prisma/prisma.service';
import { Papel, Usuario } from '../dominio/usuario';
import { UsuarioRepository } from '../dominio/portas';

/** Adaptador Prisma da porta UsuarioRepository. */
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
}
