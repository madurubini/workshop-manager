/**
 * Erros padronizados do domínio. São independentes de HTTP; o filtro de
 * exceções na camada de interfaces traduz cada um para o status correto e
 * para o envelope `{ erro: { codigo, mensagem, detalhes } }` do contrato.
 *
 * Nesta fase já existe a hierarquia mínima usada por `identidade`. Os demais
 * erros de regra de negócio entram na Fase 2 (Compartilhado).
 */
export abstract class ErroDominio extends Error {
  abstract readonly codigo: string;
  readonly detalhes?: unknown;

  constructor(mensagem: string, detalhes?: unknown) {
    super(mensagem);
    this.name = new.target.name;
    this.detalhes = detalhes;
  }
}

/** Dados inválidos / falha de validação de invariante (HTTP 400). */
export class ErroValidacao extends ErroDominio {
  readonly codigo = 'VALIDACAO';
}

/** Recurso não encontrado (HTTP 404). */
export class ErroNaoEncontrado extends ErroDominio {
  readonly codigo = 'NAO_ENCONTRADO';
}

/** Conflito de unicidade ou de versão/optimistic lock (HTTP 409). */
export class ErroConflito extends ErroDominio {
  readonly codigo = 'CONFLITO';
}

/** Transição de status inválida na máquina de estados da OS (HTTP 422). */
export class ErroTransicaoInvalida extends ErroDominio {
  readonly codigo = 'TRANSICAO_INVALIDA';
}

/** Credenciais inválidas / não autenticado (HTTP 401). */
export class ErroNaoAutenticado extends ErroDominio {
  readonly codigo = 'NAO_AUTENTICADO';
}
