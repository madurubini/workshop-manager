import { Peca } from '../../entities/peca';
import { PecaRespostaDto } from '../dtos';

/** Presenter da Peça: traduz a entidade para a resposta da API (função pura). */
export function apresentarPeca(peca: Peca): PecaRespostaDto {
  return {
    id: peca.id,
    codigo: peca.codigo,
    nome: peca.nome,
    precoUnitario: peca.precoUnitario,
    saldoFisico: peca.saldoFisico,
    reservado: peca.reservado,
    disponivel: peca.disponivel,
    ativo: peca.ativo,
  };
}
