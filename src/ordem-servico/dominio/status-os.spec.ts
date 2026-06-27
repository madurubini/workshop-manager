import { ROTULO_STATUS, StatusOS, transicaoPermitida } from './status-os';

describe('Máquina de estados — Aguardando peça', () => {
  it('permite Aguardando aprovação → Aguardando peça e → Em execução', () => {
    expect(
      transicaoPermitida(
        StatusOS.AGUARDANDO_APROVACAO,
        StatusOS.AGUARDANDO_PECA,
      ),
    ).toBe(true);
    expect(
      transicaoPermitida(StatusOS.AGUARDANDO_APROVACAO, StatusOS.EM_EXECUCAO),
    ).toBe(true);
  });

  it('permite Aguardando peça → Em execução e → Cancelada', () => {
    expect(
      transicaoPermitida(StatusOS.AGUARDANDO_PECA, StatusOS.EM_EXECUCAO),
    ).toBe(true);
    expect(
      transicaoPermitida(StatusOS.AGUARDANDO_PECA, StatusOS.CANCELADA),
    ).toBe(true);
  });

  it('rejeita Aguardando peça → Finalizada (precisa executar antes)', () => {
    expect(
      transicaoPermitida(StatusOS.AGUARDANDO_PECA, StatusOS.FINALIZADA),
    ).toBe(false);
  });

  it('tem rótulo de exibição', () => {
    expect(ROTULO_STATUS[StatusOS.AGUARDANDO_PECA]).toBe('Aguardando peça');
  });
});
