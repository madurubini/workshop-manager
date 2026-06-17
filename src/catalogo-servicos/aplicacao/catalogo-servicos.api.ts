/**
 * Porta pública do Catálogo de Serviços (open-host service). O contexto
 * Ordem de Serviço consulta o preço base por aqui — e o congela no orçamento.
 * Não expõe a entidade Servico inteira, só o necessário.
 */
export const CATALOGO_SERVICOS_API = Symbol('CatalogoServicosApi');

export interface ServicoCatalogo {
  id: string;
  nome: string;
  precoBase: number;
}

export interface CatalogoServicosApi {
  /** Busca um serviço ativo do catálogo; null se não existir/estiver inativo. */
  buscarServico(id: string): Promise<ServicoCatalogo | null>;
}
