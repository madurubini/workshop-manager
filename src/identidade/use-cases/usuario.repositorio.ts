import { Usuario } from '../entities/usuario';

export const USUARIO_REPOSITORY = Symbol('UsuarioRepository');

export interface UsuarioRepository {
  buscarPorUsername(username: string): Promise<Usuario | null>;
  /** Persiste um novo usuário administrativo. */
  inserir(usuario: Usuario): Promise<void>;
}
