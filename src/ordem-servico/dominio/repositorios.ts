import { OrdemServico } from './ordem-servico';
import { StatusOS } from './status-os';

export const ORDEM_SERVICO_REPOSITORY = Symbol('OrdemServicoRepository');

export interface FiltroOrdens {
  status?: StatusOS;
  clienteId?: string;
}

export interface OrdemServicoRepository {
  inserir(ordem: OrdemServico): Promise<void>;
  buscarPorId(id: string): Promise<OrdemServico | null>;
  listar(filtro?: FiltroOrdens): Promise<OrdemServico[]>;
  /** Gera o próximo número sequencial da OS (ex.: OS-000001). */
  proximoNumero(): Promise<string>;
}
