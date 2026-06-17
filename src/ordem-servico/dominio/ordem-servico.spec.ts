import { ErroTransicaoInvalida } from '../../compartilhado/erros/erros-dominio';
import { OrdemServico } from './ordem-servico';
import { StatusOS, transicaoPermitida } from './status-os';

function abrirOS(): OrdemServico {
  return OrdemServico.abrir({
    id: 'os-1',
    numero: 'OS-000001',
    clienteId: 'c1',
    veiculoId: 'v1',
    problemaRelatado: 'Barulho na suspensão',
    por: 'recepcionista',
  });
}

describe('OrdemServico.abrir', () => {
  it('abre no status Recebida com histórico e evento', () => {
    const os = abrirOS();
    expect(os.status).toBe(StatusOS.RECEBIDA);
    expect(os.versao).toBe(0);
    expect(os.pago).toBe(false);
    expect(os.historico).toHaveLength(1);
    expect(os.historico[0].status).toBe(StatusOS.RECEBIDA);
    expect(os.historico[0].por).toBe('recepcionista');
    const eventos = os.puxarEventos();
    expect(eventos).toHaveLength(1);
    expect(eventos[0].nomeEvento).toBe('ordem-servico.os-aberta');
  });

  it('exige problema relatado', () => {
    expect(() =>
      OrdemServico.abrir({
        id: 'os-1',
        numero: 'OS-1',
        clienteId: 'c1',
        veiculoId: 'v1',
        problemaRelatado: '   ',
      }),
    ).toThrow('Problema relatado é obrigatório.');
  });
});

describe('Máquina de estados da OS', () => {
  it('permite o caminho feliz completo', () => {
    const os = abrirOS();
    os.transicionarPara(StatusOS.EM_DIAGNOSTICO);
    os.transicionarPara(StatusOS.AGUARDANDO_APROVACAO);
    os.transicionarPara(StatusOS.EM_EXECUCAO);
    os.transicionarPara(StatusOS.FINALIZADA);
    os.transicionarPara(StatusOS.ENTREGUE);
    expect(os.status).toBe(StatusOS.ENTREGUE);
    expect(os.historico).toHaveLength(6);
  });

  it('grava histórico e evento a cada transição', () => {
    const os = abrirOS();
    os.puxarEventos();
    os.transicionarPara(StatusOS.EM_DIAGNOSTICO, 'mecanico');
    expect(os.historico[1]).toMatchObject({
      status: StatusOS.EM_DIAGNOSTICO,
      por: 'mecanico',
    });
    const eventos = os.puxarEventos();
    expect(eventos[0].nomeEvento).toBe('ordem-servico.status-alterado');
  });

  it('rejeita transição fora da ordem (ex.: Recebida → Em execução)', () => {
    const os = abrirOS();
    expect(() => os.transicionarPara(StatusOS.EM_EXECUCAO)).toThrow(
      ErroTransicaoInvalida,
    );
    expect(os.status).toBe(StatusOS.RECEBIDA);
  });

  it('permite cancelar a partir de estados vivos, mas não de estados finais', () => {
    expect(transicaoPermitida(StatusOS.RECEBIDA, StatusOS.CANCELADA)).toBe(
      true,
    );
    expect(transicaoPermitida(StatusOS.EM_EXECUCAO, StatusOS.CANCELADA)).toBe(
      true,
    );
    expect(transicaoPermitida(StatusOS.ENTREGUE, StatusOS.CANCELADA)).toBe(
      false,
    );
    expect(
      transicaoPermitida(StatusOS.CANCELADA, StatusOS.EM_DIAGNOSTICO),
    ).toBe(false);
  });

  it('não permite transicionar a partir de um estado final', () => {
    const os = abrirOS();
    os.transicionarPara(StatusOS.CANCELADA);
    expect(() => os.transicionarPara(StatusOS.EM_DIAGNOSTICO)).toThrow(
      ErroTransicaoInvalida,
    );
  });
});
