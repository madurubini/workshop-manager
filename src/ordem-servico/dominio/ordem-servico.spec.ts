import {
  ErroTransicaoInvalida,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import { SituacaoItemPeca, StatusOrcamento } from './itens';
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

describe('OrdemServico.registrarDiagnostico', () => {
  const itemServico = {
    id: 'is1',
    servicoId: 's1',
    descricao: 'Troca de óleo',
    quantidade: 2,
    precoAplicado: 120,
    reparoId: null,
  };
  const itemPeca = {
    id: 'ip1',
    pecaId: 'p1',
    descricao: 'Filtro',
    quantidade: 4,
    precoAplicado: 35,
    situacao: SituacaoItemPeca.DISPONIVEL,
    reparoId: null,
  };

  it('calcula os totais, gera orçamento GERADO e vai para Em diagnóstico', () => {
    const os = abrirOS();
    os.puxarEventos();
    os.registrarDiagnostico({
      itensServico: [itemServico],
      itensPeca: [itemPeca],
      orcamentoId: 'orc-1',
    });

    expect(os.status).toBe(StatusOS.EM_DIAGNOSTICO);
    expect(os.orcamento?.totalServicos).toBe(240); // 2 * 120
    expect(os.orcamento?.totalPecas).toBe(140); // 4 * 35
    expect(os.orcamento?.total).toBe(380);
    expect(os.orcamento?.status).toBe(StatusOrcamento.GERADO);

    const nomes = os.puxarEventos().map((e) => e.nomeEvento);
    expect(nomes).toContain('ordem-servico.status-alterado');
    expect(nomes).toContain('ordem-servico.diagnostico-concluido');
    expect(nomes).toContain('ordem-servico.orcamento-gerado');
  });

  it('exige ao menos um serviço ou peça', () => {
    const os = abrirOS();
    expect(() =>
      os.registrarDiagnostico({
        itensServico: [],
        itensPeca: [],
        orcamentoId: 'orc-1',
      }),
    ).toThrow(ErroValidacao);
    // não pode ter mudado de status
    expect(os.status).toBe(StatusOS.RECEBIDA);
  });

  it('não registra diagnóstico se a OS não está em Recebida', () => {
    const os = abrirOS();
    os.transicionarPara(StatusOS.EM_DIAGNOSTICO);
    expect(() =>
      os.registrarDiagnostico({
        itensServico: [itemServico],
        itensPeca: [],
        orcamentoId: 'orc-1',
      }),
    ).toThrow(ErroTransicaoInvalida);
  });
});

describe('Ciclo de vida do orçamento na OS', () => {
  const itemServico = {
    id: 'is1',
    servicoId: 's1',
    descricao: 'Serviço',
    quantidade: 1,
    precoAplicado: 100,
    reparoId: null,
  };
  const pecaDisponivel = {
    id: 'ip1',
    pecaId: 'p1',
    descricao: 'Filtro',
    quantidade: 2,
    precoAplicado: 35,
    situacao: SituacaoItemPeca.DISPONIVEL,
    reparoId: null,
  };
  const pecaCotada = {
    id: 'ip2',
    pecaId: 'p2',
    descricao: 'Pastilha',
    quantidade: 1,
    precoAplicado: 198,
    situacao: SituacaoItemPeca.EM_COTACAO,
    reparoId: null,
  };

  function osComOrcamento(): OrdemServico {
    const os = abrirOS();
    os.registrarDiagnostico({
      itensServico: [itemServico],
      itensPeca: [pecaDisponivel, pecaCotada],
      orcamentoId: 'orc-1',
    });
    os.puxarEventos();
    return os;
  }

  it('enviar: GERADO → ENVIADO e OS → Aguardando aprovação', () => {
    const os = osComOrcamento();
    os.enviarOrcamento('recepcionista');
    expect(os.status).toBe(StatusOS.AGUARDANDO_APROVACAO);
    expect(os.orcamento?.status).toBe(StatusOrcamento.ENVIADO);
    expect(os.orcamento?.enviadoEm).toBeInstanceOf(Date);
    expect(os.puxarEventos().map((e) => e.nomeEvento)).toContain(
      'ordem-servico.orcamento-enviado',
    );
  });

  it('não envia se o orçamento não está GERADO', () => {
    const os = osComOrcamento();
    os.enviarOrcamento();
    expect(() => os.enviarOrcamento()).toThrow(ErroTransicaoInvalida);
  });

  it('aprovar: ENVIADO → APROVADO, OS → Em execução, itens reservada/encomendada', () => {
    const os = osComOrcamento();
    os.enviarOrcamento();
    os.puxarEventos();

    os.aprovarOrcamento('cliente');

    expect(os.status).toBe(StatusOS.EM_EXECUCAO);
    expect(os.orcamento?.status).toBe(StatusOrcamento.APROVADO);
    expect(os.itensPeca[0].situacao).toBe(SituacaoItemPeca.RESERVADA);
    expect(os.itensPeca[1].situacao).toBe(SituacaoItemPeca.ENCOMENDADA);

    const aprovado = os
      .puxarEventos()
      .find((e) => e.nomeEvento === 'ordem-servico.orcamento-aprovado');
    expect(aprovado).toBeDefined();
    // o evento carrega a situação ORIGINAL (para o estoque decidir)
    const payload = aprovado as unknown as {
      itensPeca: { situacao: string }[];
    };
    expect(payload.itensPeca).toEqual([
      expect.objectContaining({ situacao: 'DISPONIVEL' }),
      expect.objectContaining({ situacao: 'EM_COTACAO' }),
    ]);
  });

  it('recusar: ENVIADO → RECUSADO e OS → Cancelada', () => {
    const os = osComOrcamento();
    os.enviarOrcamento();
    os.puxarEventos();

    os.recusarOrcamento('Muito caro', 'cliente');

    expect(os.status).toBe(StatusOS.CANCELADA);
    expect(os.orcamento?.status).toBe(StatusOrcamento.RECUSADO);
    expect(os.puxarEventos().map((e) => e.nomeEvento)).toContain(
      'ordem-servico.orcamento-recusado',
    );
  });

  it('não aprova um orçamento que não foi enviado', () => {
    const os = osComOrcamento(); // orçamento GERADO, não ENVIADO
    expect(() => os.aprovarOrcamento()).toThrow(ErroTransicaoInvalida);
  });
});
