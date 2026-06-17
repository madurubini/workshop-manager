import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ErroConflito,
  ErroDominio,
  ErroNaoAutenticado,
  ErroNaoEncontrado,
  ErroTransicaoInvalida,
  ErroValidacao,
} from './erros-dominio';

/**
 * Traduz qualquer exceção para o envelope padrão do contrato:
 * `{ erro: { codigo, mensagem, detalhes } }`.
 *
 * Mapeia os erros de domínio para os status HTTP definidos no contrato-api
 * (400 validação, 401 auth, 404, 409 conflito, 422 transição inválida).
 */
@Catch()
export class FiltroExcecaoGlobal implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcecaoGlobal.name);

  catch(excecao: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const resposta = ctx.getResponse<Response>();

    const { status, codigo, mensagem, detalhes } = this.traduzir(excecao);

    if (status >= 500) {
      this.logger.error(excecao);
    }

    resposta.status(status).json({
      erro: { codigo, mensagem, detalhes },
    });
  }

  private traduzir(excecao: unknown): {
    status: number;
    codigo: string;
    mensagem: string;
    detalhes?: unknown;
  } {
    if (excecao instanceof ErroDominio) {
      return {
        status: this.statusDoErroDominio(excecao),
        codigo: excecao.codigo,
        mensagem: excecao.message,
        detalhes: excecao.detalhes,
      };
    }

    if (excecao instanceof HttpException) {
      const status = excecao.getStatus();
      const corpo = excecao.getResponse();
      const mensagem =
        typeof corpo === 'string'
          ? corpo
          : (((corpo as Record<string, unknown>).message as string) ??
            excecao.message);
      return {
        status,
        codigo: this.codigoPadraoPorStatus(status),
        mensagem: Array.isArray(mensagem) ? mensagem.join('; ') : mensagem,
        detalhes:
          typeof corpo === 'object'
            ? (corpo as Record<string, unknown>).message
            : undefined,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      codigo: 'ERRO_INTERNO',
      mensagem: 'Erro interno do servidor.',
    };
  }

  private statusDoErroDominio(erro: ErroDominio): number {
    if (erro instanceof ErroValidacao) return HttpStatus.BAD_REQUEST;
    if (erro instanceof ErroNaoAutenticado) return HttpStatus.UNAUTHORIZED;
    if (erro instanceof ErroNaoEncontrado) return HttpStatus.NOT_FOUND;
    if (erro instanceof ErroConflito) return HttpStatus.CONFLICT;
    if (erro instanceof ErroTransicaoInvalida)
      return HttpStatus.UNPROCESSABLE_ENTITY;
    return HttpStatus.BAD_REQUEST;
  }

  private codigoPadraoPorStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDACAO';
      case HttpStatus.UNAUTHORIZED:
        return 'NAO_AUTENTICADO';
      case HttpStatus.FORBIDDEN:
        return 'NAO_AUTORIZADO';
      case HttpStatus.NOT_FOUND:
        return 'NAO_ENCONTRADO';
      case HttpStatus.CONFLICT:
        return 'CONFLITO';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'TRANSICAO_INVALIDA';
      default:
        return 'ERRO';
    }
  }
}
