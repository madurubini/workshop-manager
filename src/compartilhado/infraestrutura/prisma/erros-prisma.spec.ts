import { Prisma } from '@prisma/client';
import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../erros/erros-dominio';
import { traduzirErroPrisma } from './erros-prisma';

function erroDoPrisma(
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('falha do banco', {
    code,
    clientVersion: '5.22.0',
    meta,
  });
}

describe('traduzirErroPrisma', () => {
  it('P2002 (violação de unicidade) vira conflito com os campos', () => {
    const erro = traduzirErroPrisma(
      erroDoPrisma('P2002', { target: ['documento'] }),
    );

    expect(erro).toBeInstanceOf(ErroConflito);
    expect(erro?.detalhes).toEqual({ campos: ['documento'] });
  });

  it('aceita o alvo do P2002 como string única', () => {
    const erro = traduzirErroPrisma(erroDoPrisma('P2002', { target: 'placa' }));

    expect(erro?.detalhes).toEqual({ campos: ['placa'] });
  });

  it('P2002 sem meta não inventa campo', () => {
    const erro = traduzirErroPrisma(erroDoPrisma('P2002'));

    expect(erro).toBeInstanceOf(ErroConflito);
    expect(erro?.detalhes).toEqual({ campos: null });
  });

  it('P2025 (registro exigido não existe) vira não encontrado', () => {
    expect(traduzirErroPrisma(erroDoPrisma('P2025'))).toBeInstanceOf(
      ErroNaoEncontrado,
    );
  });

  it('P2003 (chave estrangeira inválida) vira erro de validação', () => {
    const erro = traduzirErroPrisma(
      erroDoPrisma('P2003', { field_name: 'clienteId' }),
    );

    expect(erro).toBeInstanceOf(ErroValidacao);
    expect(erro?.detalhes).toEqual({ campos: ['clienteId'] });
  });

  it('devolve null para código do Prisma que não sabemos traduzir', () => {
    expect(traduzirErroPrisma(erroDoPrisma('P2010'))).toBeNull();
  });

  it('devolve null para erro que não é do Prisma', () => {
    expect(traduzirErroPrisma(new Error('qualquer outro'))).toBeNull();
  });
});
