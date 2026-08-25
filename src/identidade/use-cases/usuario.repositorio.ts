import { Usuario } from '../entities/usuario';

export const USUARIO_REPOSITORY = Symbol('UsuarioRepository');

export interface UsuarioRepository {
  buscarPorUsername(username: string): Promise<Usuario | null>;
  inserir(usuario: Usuario): Promise<void>;
}
