import { SetMetadata } from '@nestjs/common';
import { Papel } from '../dominio/usuario';

export const PAPEIS_CHAVE = 'papeis';

/**
 * Marca uma rota como restrita a determinados papéis. Lido pelo PapeisGuard,
 * que compara com o papel do usuário autenticado (vindo do JWT).
 * Ex.: `@Papeis('GESTOR')`.
 */
export const Papeis = (...papeis: Papel[]) => SetMetadata(PAPEIS_CHAVE, papeis);
