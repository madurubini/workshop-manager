import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ErroConflito,
  ErroNaoEncontrado,
} from '../../compartilhado/erros/erros-dominio';
import { Peca } from '../dominio/peca';
import { PECA_REPOSITORY, PecaRepository } from '../dominio/repositorios';
import { AtenderEncomendasDaPeca } from './atender-encomendas.service';

@Injectable()
export class CadastrarPeca {
  constructor(
    @Inject(PECA_REPOSITORY)
    private readonly pecas: PecaRepository,
  ) {}

  async executar(entrada: {
    codigo: string;
    nome: string;
    precoUnitario: number;
    saldoFisico?: number;
  }): Promise<Peca> {
    const peca = Peca.criar({ id: randomUUID(), ...entrada });
    const existente = await this.pecas.buscarPorCodigo(peca.codigo);
    if (existente) {
      throw new ErroConflito('Já existe uma peça com este código.', {
        codigo: peca.codigo,
      });
    }
    await this.pecas.inserir(peca);
    return peca;
  }
}

@Injectable()
export class AtualizarPeca {
  constructor(
    @Inject(PECA_REPOSITORY)
    private readonly pecas: PecaRepository,
  ) {}

  async executar(entrada: {
    id: string;
    nome?: string;
    precoUnitario?: number;
  }): Promise<Peca> {
    const peca = await buscar(this.pecas, entrada.id);
    peca.atualizarDados(entrada);
    await this.pecas.salvar(peca);
    return peca;
  }
}

@Injectable()
export class RemoverPeca {
  constructor(
    @Inject(PECA_REPOSITORY)
    private readonly pecas: PecaRepository,
  ) {}

  async executar(entrada: { id: string }): Promise<void> {
    const peca = await buscar(this.pecas, entrada.id);
    peca.inativar();
    await this.pecas.salvar(peca);
  }
}

@Injectable()
export class AjustarEstoque {
  private readonly logger = new Logger(AjustarEstoque.name);

  constructor(
    @Inject(PECA_REPOSITORY)
    private readonly pecas: PecaRepository,
    private readonly atenderEncomendas: AtenderEncomendasDaPeca,
  ) {}

  async executar(entrada: {
    id: string;
    tipo: 'ENTRADA' | 'SAIDA';
    quantidade: number;
    motivo?: string;
  }): Promise<Peca> {
    const peca = await buscar(this.pecas, entrada.id);
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
}

async function buscar(repo: PecaRepository, id: string): Promise<Peca> {
  const peca = await repo.buscarPorId(id);
  if (!peca || !peca.ativo) {
    throw new ErroNaoEncontrado('Peça não encontrada.', { id });
  }
  return peca;
}
