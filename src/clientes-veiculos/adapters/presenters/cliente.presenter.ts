import { Cliente } from '../../entities/cliente';
import { ClienteRespostaDto } from '../dtos';

export function apresentarCliente(cliente: Cliente): ClienteRespostaDto {
  return {
    id: cliente.id,
    tipoDocumento: cliente.documento.tipo,
    documento: cliente.documento.formatado,
    nome: cliente.nome,
    email: cliente.email,
    telefone: cliente.telefone,
    ativo: cliente.ativo,
  };
}
