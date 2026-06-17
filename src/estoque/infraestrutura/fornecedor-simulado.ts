import { Injectable } from '@nestjs/common';
import { CotacaoFornecedor, Fornecedor } from '../dominio/fornecedor';

/**
 * Adaptador simulado do sistema externo Fornecedor (MVP). Em produção, daria
 * lugar a uma integração real (HTTP/fila). Aqui devolve uma cotação plausível:
 * preço de referência + 10% e prazo fixo. Trocá-lo não afeta o domínio — é a
 * vantagem de o Fornecedor ser uma porta.
 */
@Injectable()
export class FornecedorSimulado implements Fornecedor {
  async cotar(entrada: {
    pecaId: string;
    quantidade: number;
    precoReferencia: number;
  }): Promise<CotacaoFornecedor> {
    const preco = Math.round(entrada.precoReferencia * 1.1 * 100) / 100;
    return {
      preco,
      prazoDias: 7,
      fornecedor: 'Fornecedor Padrão (simulado)',
    };
  }
}
