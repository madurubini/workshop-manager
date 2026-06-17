/**
 * Evento de domínio: algo relevante que já aconteceu no negócio
 * (ex.: "Orçamento aprovado"). É imutável e nomeado.
 *
 * O `nomeEvento` é a chave usada pelo event bus para entregar o evento aos
 * assinantes de outros módulos (`@OnEvent(nome)`). Use namespacing por
 * contexto, ex.: 'orcamento.aprovado', 'estoque.peca-recebida'.
 */
export abstract class EventoDominio {
  /** Momento em que o evento ocorreu. */
  readonly ocorridoEm: Date;

  constructor(ocorridoEm: Date = new Date()) {
    this.ocorridoEm = ocorridoEm;
  }

  /** Nome estável do evento, usado como tópico no event bus. */
  abstract get nomeEvento(): string;
}
