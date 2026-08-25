import { Prisma } from '@prisma/client';
import { TradutorDeErro } from '../../erros/filtro-excecao-global';
import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../erros/erros-dominio';

/**
 * Os casos de uso checam unicidade antes de gravar, mas a checagem não é
 * atômica: sob concorrência quem decide é o banco, e sem esta tradução a
 * violação de constraint vazaria como 500 em vez do 409 esperado.
 */
export const traduzirErroPrisma: TradutorDeErro = (erro) => {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  switch (erro.code) {
    case 'P2002':
      return new ErroConflito('Já existe um registro com este valor.', {
        campos: camposDoAlvo(erro.meta?.target),
      });

    case 'P2025':
      return new ErroNaoEncontrado('Registro não encontrado.');

    case 'P2003':
      return new ErroValidacao('Referência inválida para outro registro.', {
        campos: camposDoAlvo(erro.meta?.field_name),
      });

    default:
      return null;
  }
};

/** O `meta` do Prisma traz o alvo como string ou lista, conforme o caso. */
function camposDoAlvo(alvo: unknown): string[] | null {
  if (Array.isArray(alvo)) return alvo as string[];
  if (typeof alvo === 'string') return [alvo];
  return null;
}
