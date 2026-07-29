import { EventoDominio } from '../../compartilhado/dominio/evento-dominio';

/**
 * Evento do Estoque para o núcleo Ordem de Serviço: uma peça encomendada chegou
 * e foi reservada para a OS. É o caminho de volta (estoque → OS) — a OS reage
 * marcando a peça como reservada e, se não falta mais nenhuma, retoma a
 * execução. Campos são tipos simples (string/number) para não acoplar a OS aos
 * tipos internos do Estoque.
 */
export class PecaRecebida extends EventoDominio {
  constructor(
    readonly ordemId: string,
    readonly pecaId: string,
    readonly quantidade: number,
  ) {
    super();
  }
  get nomeEvento(): string {
    return 'estoque.peca-recebida';
  }
}
