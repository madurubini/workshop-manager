/**
 * Porta de geração de identificadores. Os casos de uso dependem desta abstração
 * para criar ids sem conhecer o mecanismo concreto (crypto/uuid) — que é um
 * detalhe de infraestrutura (Frameworks & Drivers). Isso mantém a aplicação
 * livre de dependências de runtime e torna os testes determinísticos (um mock
 * pode devolver um id fixo).
 */
export const GERADOR_DE_ID = Symbol('GeradorDeId');

export interface GeradorDeId {
  /** Gera um novo identificador único. */
  novo(): string;
}
