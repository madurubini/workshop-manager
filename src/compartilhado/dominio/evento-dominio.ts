/**
 * Algo que já aconteceu no negócio. O `nomeEvento` é a chave do `@OnEvent`,
 * com namespace por contexto: 'orcamento.aprovado', 'estoque.peca-recebida'.
 */
export abstract class EventoDominio {
  readonly ocorridoEm: Date;

  constructor(ocorridoEm: Date = new Date()) {
    this.ocorridoEm = ocorridoEm;
  }

  /** Tópico no event bus — precisa ser estável. */
  abstract get nomeEvento(): string;
}
