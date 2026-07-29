import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  GERADOR_DE_ID,
  GeradorDeId,
} from '../../compartilhado/dominio/gerador-de-id';
import {
  ErroConflito,
  ErroNaoEncontrado,
} from '../../compartilhado/erros/erros-dominio';
import { Peca } from '../entities/peca';
import { PECA_REPOSITORY, PecaRepository } from './peca.repositorio';
import { AtenderEncomendasDaPeca } from './atender-encomendas.service';

export interface EntradaCadastrarPeca {
  codigo: string;
  nome: string;
  precoUnitario: number;
  saldoFisico?: number;
}

export interface EntradaAtualizarPeca {
  id: string;
  nome?: string;
  precoUnitario?: number;
}

export interface EntradaAjusteEstoque {
  id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  motivo?: string;
}

/**
 * Casos de uso do agregado Peça (CRUD + ajuste de saldo). As invariantes de
 * saldo/reserva moram na entidade Peca; aqui ficam as regras que cruzam o
 * repositório (código único) e o efeito de atender encomendas quando entra
 * saldo.
 */
@Injectable()
export class PecaUseCases {
  private readonly logger = new Logger(PecaUseCases.name);

  constructor(
    @Inject(PECA_REPOSITORY)
    private readonly pecas: PecaRepository,
    @Inject(GERADOR_DE_ID)
    private readonly ids: GeradorDeId,
    private readonly atenderEncomendas: AtenderEncomendasDaPeca,
  ) {}

  async cadastrar(entrada: EntradaCadastrarPeca): Promise<Peca> {
    const peca = Peca.criar({ id: this.ids.novo(), ...entrada });
    const existente = await this.pecas.buscarPorCodigo(peca.codigo);
    if (existente) {
      throw new ErroConflito('Já existe uma peça com este código.', {
        codigo: peca.codigo,
      });
    }
    await this.pecas.inserir(peca);
    return peca;
  }

  async atualizar(entrada: EntradaAtualizarPeca): Promise<Peca> {
    const peca = await this.buscarAtivaOuFalhar(entrada.id);
    peca.atualizarDados(entrada);
    await this.pecas.salvar(peca);
    return peca;
  }

  async remover(id: string): Promise<void> {
    const peca = await this.buscarAtivaOuFalhar(id);
    peca.inativar();
    await this.pecas.salvar(peca);
  }

  async ajustarEstoque(entrada: EntradaAjusteEstoque): Promise<Peca> {
    const peca = await this.buscarAtivaOuFalhar(entrada.id);
    peca.ajustarSaldo(entrada.tipo, entrada.quantidade);
    await this.pecas.salvar(peca);
    this.logger.log(
      `Ajuste ${entrada.tipo} de ${entrada.quantidade} na peça ${entrada.id}` +
        (entrada.motivo ? ` (motivo: ${entrada.motivo})` : ''),
    );
    // Entrada de saldo pode liberar encomendas que aguardavam esta peça.
    if (entrada.tipo === 'ENTRADA') {
      await this.atenderEncomendas.executar(peca.id);
    }
    return peca;
  }

  async listar(): Promise<Peca[]> {
    return this.pecas.listar();
  }

  async buscar(id: string): Promise<Peca> {
    const peca = await this.pecas.buscarPorId(id);
    if (!peca) {
      throw new ErroNaoEncontrado('Peça não encontrada.', { id });
    }
    return peca;
  }

  private async buscarAtivaOuFalhar(id: string): Promise<Peca> {
    const peca = await this.pecas.buscarPorId(id);
    if (!peca || !peca.ativo) {
      throw new ErroNaoEncontrado('Peça não encontrada.', { id });
    }
    return peca;
  }
}
