import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AcompanhamentoToken } from '../dominio/portas';
import { AcompanhamentoGuard } from './acompanhamento.guard';

function contexto(req: {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  params?: Record<string, string>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('AcompanhamentoGuard', () => {
  let tokens: jest.Mocked<AcompanhamentoToken>;
  let guard: AcompanhamentoGuard;

  beforeEach(() => {
    tokens = { gerar: jest.fn(), verificar: jest.fn() };
    guard = new AcompanhamentoGuard(tokens);
  });

  it('libera quando o token é válido e o osId bate com a URL', async () => {
    tokens.verificar.mockResolvedValue({ osId: 'os-1' });
    const ctx = contexto({
      headers: { authorization: 'Bearer tok' },
      params: { osId: 'os-1' },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(tokens.verificar).toHaveBeenCalledWith('tok');
  });

  it('aceita o token também via query ?token=', async () => {
    tokens.verificar.mockResolvedValue({ osId: 'os-1' });
    const ctx = contexto({ query: { token: 'tok' }, params: { osId: 'os-1' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('401 quando não há token', async () => {
    const ctx = contexto({ params: { osId: 'os-1' } });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('401 quando o token é inválido/expirado', async () => {
    tokens.verificar.mockResolvedValue(null);
    const ctx = contexto({
      headers: { authorization: 'Bearer ruim' },
      params: { osId: 'os-1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('403 quando o token é de OUTRA OS (anti-IDOR)', async () => {
    tokens.verificar.mockResolvedValue({ osId: 'os-2' });
    const ctx = contexto({
      headers: { authorization: 'Bearer tok' },
      params: { osId: 'os-1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
