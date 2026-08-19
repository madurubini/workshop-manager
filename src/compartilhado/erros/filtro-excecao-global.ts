import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import {
  ErroConflito,
  ErroDominio,
  ErroNaoAutenticado,
  ErroNaoAutorizado,
  ErroNaoEncontrado,
  ErroTransicaoInvalida,
  ErroValidacao,
} from './erros-dominio';

/**
 * Converte um erro de infraestrutura (ex.: violação de unicidade do Prisma) no
 * erro de domínio equivalente, ou devolve `null` se não souber traduzi-lo.
 *
 * Existe para que o filtro continue **sem conhecer o Prisma**: quem conhece é o
 * tradutor, que vive na camada de infraestrutura e entra por injeção.
 */
export type TradutorDeErro = (erro: unknown) => ErroDominio | null;

export interface OpcoesFiltroExcecao {
  /** Tradutores de erro de infraestrutura → erro de domínio, em ordem. */
  tradutores?: TradutorDeErro[];
  /** Gerador do identificador de ocorrência (injetável para testar). */
  gerarIdDaOcorrencia?: () => string;
}

/**
 * Traduz qualquer exceção para o envelope padrão do contrato:
 * `{ erro: { codigo, mensagem, detalhes } }`.
 *
 * Mapeia os erros de domínio para os status HTTP definidos no contrato-api
 * (400 validação, 401 auth, 403 autorização, 404, 409 conflito, 422 transição
 * inválida). O que não é reconhecido vira 500 com um **id de ocorrência**: o
 * mesmo id vai para o log e para a resposta, então o suporte liga um ao outro
 * sem expor a stack ao cliente.
 */
@Catch()
export class FiltroExcecaoGlobal implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcecaoGlobal.name);
  private readonly tradutores: TradutorDeErro[];
  private readonly gerarIdDaOcorrencia: () => string;

  constructor(opcoes: OpcoesFiltroExcecao = {}) {
    this.tradutores = opcoes.tradutores ?? [];
    this.gerarIdDaOcorrencia = opcoes.gerarIdDaOcorrencia ?? randomUUID;
  }

  catch(excecao: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const resposta = ctx.getResponse<Response>();

    const { status, codigo, mensagem, detalhes } = this.traduzir(excecao);

    resposta.status(status).json({
      erro: { codigo, mensagem, detalhes: detalhes ?? null },
    });
  }

  private traduzir(excecao: unknown): {
    status: number;
    codigo: string;
    mensagem: string;
    detalhes?: unknown;
  } {
    const erroDominio =
      excecao instanceof ErroDominio ? excecao : this.traduzirInfra(excecao);

    if (erroDominio) {
      return {
        status: this.statusDoErroDominio(erroDominio),
        codigo: erroDominio.codigo,
        mensagem: erroDominio.message,
        detalhes: erroDominio.detalhes,
      };
    }

    if (excecao instanceof HttpException) {
      const status = excecao.getStatus();
      const corpo = excecao.getResponse();
      const mensagens = this.mensagensDe(corpo, excecao.message);
      return {
        status,
        codigo: this.codigoPadraoPorStatus(status),
        mensagem: mensagens.join('; '),
        // Sempre a lista de mensagens: um formato só, venha do class-validator
        // (array) ou de uma exceção com string única.
        detalhes: mensagens,
      };
    }

    // Desconhecido: 500 com id de ocorrência para casar log e resposta.
    const idDaOcorrencia = this.gerarIdDaOcorrencia();
    this.logger.error(`Erro não tratado [${idDaOcorrencia}]`, excecao);
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      codigo: 'ERRO_INTERNO',
      mensagem: 'Erro interno do servidor.',
      detalhes: { idDaOcorrencia },
    };
  }

  /** Primeiro tradutor que reconhecer o erro de infraestrutura ganha. */
  private traduzirInfra(excecao: unknown): ErroDominio | null {
    for (const traduzir of this.tradutores) {
      const erro = traduzir(excecao);
      if (erro) return erro;
    }
    return null;
  }

  private mensagensDe(corpo: unknown, fallback: string): string[] {
    if (typeof corpo === 'string') return [corpo];
    const mensagem = (corpo as Record<string, unknown> | null)?.message;
    if (Array.isArray(mensagem)) return mensagem as string[];
    if (typeof mensagem === 'string') return [mensagem];
    return [fallback];
  }

  private statusDoErroDominio(erro: ErroDominio): number {
    if (erro instanceof ErroValidacao) return HttpStatus.BAD_REQUEST;
    if (erro instanceof ErroNaoAutenticado) return HttpStatus.UNAUTHORIZED;
    if (erro instanceof ErroNaoAutorizado) return HttpStatus.FORBIDDEN;
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
