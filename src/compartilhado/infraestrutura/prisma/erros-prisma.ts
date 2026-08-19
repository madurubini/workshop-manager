import { Prisma } from '@prisma/client';
import { TradutorDeErro } from '../../erros/filtro-excecao-global';
import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../erros/erros-dominio';

/**
 * Traduz os erros conhecidos do Prisma para erros de domínio.
 *
 * Os casos de uso já checam unicidade e existência antes de gravar, mas essas
 * checagens não são atômicas: em duas requisições concorrentes o banco é quem
 * decide, e sem esta tradução a violação de constraint vazaria como 500. Aqui
 * ela vira o mesmo 409/404 que o caminho feliz produziria.
 *
 * Vive na infraestrutura porque é o único lugar que pode conhecer o Prisma; o
 * filtro global o recebe como `TradutorDeErro` e continua agnóstico.
 */
export const traduzirErroPrisma: TradutorDeErro = (erro) => {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  switch (erro.code) {
    // Violação de restrição única (documento, placa, código da peça...).
    case 'P2002':
      return new ErroConflito('Já existe um registro com este valor.', {
        campos: camposDoAlvo(erro.meta?.target),
      });

    // Registro exigido pela operação não existe (update/delete sem alvo).
    case 'P2025':
      return new ErroNaoEncontrado('Registro não encontrado.');

    // Chave estrangeira inválida: aponta para algo que não existe.
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
