/**
 * Independentes de HTTP: o filtro global traduz cada um para o status e para
 * o envelope `{ erro: { codigo, mensagem, detalhes } }` do contrato.
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

/** Autenticado, mas sem permissão (HTTP 403). */
export class ErroNaoAutorizado extends ErroDominio {
  readonly codigo = 'NAO_AUTORIZADO';
}
