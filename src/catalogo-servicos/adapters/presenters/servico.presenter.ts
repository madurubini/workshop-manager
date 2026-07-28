import { Servico } from '../../entities/servico';
import { ServicoRespostaDto } from '../dtos';

/**
 * Presenter do Serviço: traduz a entidade para o formato de resposta da API.
 * É uma função pura (sem estado) — o papel de "apresentar" da Aula 5, sem
 * precisar de uma classe por caso de uso.
 */
export function apresentarServico(servico: Servico): ServicoRespostaDto {
  return {
    id: servico.id,
    nome: servico.nome,
    descricao: servico.descricao,
    precoBase: servico.precoBase,
    ativo: servico.ativo,
  };
}
