import type { OrdemServicoConsultaApi } from '../../ordem-servico/aplicacao/ordem-servico-consulta.api';
import type {
  OrcamentoAprovado,
  OrcamentoEnviado,
  OrcamentoRecusado,
} from '../../ordem-servico/dominio/eventos';
import { Notificador } from '../dominio/notificador';
import { NotificarCliente } from './notificar-cliente.handler';
import { ReenviarPendentes } from './reenviar-pendentes.policy';

describe('NotificarCliente (assinante de eventos)', () => {
  let notificador: jest.Mocked<Notificador>;
  let handler: NotificarCliente;

  beforeEach(() => {
    notificador = { notificar: jest.fn() };
    handler = new NotificarCliente(notificador);
  });

  it('notifica ao enviar o orçamento', async () => {
    await handler.aoEnviar({
      ordemId: 'os-1',
      numero: 'OS-1',
    } as OrcamentoEnviado);
    expect(notificador.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ ordemId: 'os-1', tipo: 'ORCAMENTO_ENVIADO' }),
    );
  });

  it('notifica ao aprovar (fan-out: estoque reserva, notificacoes avisa)', async () => {
    await handler.aoAprovar({
      ordemId: 'os-1',
      itensPeca: [],
    } as unknown as OrcamentoAprovado);
    expect(notificador.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ORCAMENTO_APROVADO' }),
    );
  });

  it('notifica ao recusar', async () => {
    await handler.aoRecusar({
      ordemId: 'os-1',
      justificativa: null,
    } as OrcamentoRecusado);
    expect(notificador.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ORCAMENTO_RECUSADO' }),
    );
  });
});

describe('ReenviarPendentes (cliente sem resposta)', () => {
  let consulta: jest.Mocked<OrdemServicoConsultaApi>;
  let notificador: jest.Mocked<Notificador>;
  let policy: ReenviarPendentes;

  beforeEach(() => {
    consulta = {
      listarAguardandoResposta: jest.fn().mockResolvedValue([]),
      listarReparosAguardando: jest.fn().mockResolvedValue([]),
    };
    notificador = { notificar: jest.fn() };
    policy = new ReenviarPendentes(consulta, notificador);
  });

  it('reenvia lembrete para orçamentos e reparos aguardando', async () => {
    consulta.listarAguardandoResposta.mockResolvedValue([
      { ordemId: 'os-1', numero: 'OS-1' },
    ]);
    consulta.listarReparosAguardando.mockResolvedValue([
      { ordemId: 'os-2', numero: 'OS-2', reparoId: 'rep-1' },
    ]);

    await policy.reenviar();

    expect(notificador.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'LEMBRETE_APROVACAO' }),
    );
    expect(notificador.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'LEMBRETE_REPARO' }),
    );
  });

  it('não faz nada quando não há pendências', async () => {
    await policy.reenviar();
    expect(notificador.notificar).not.toHaveBeenCalled();
  });
});
