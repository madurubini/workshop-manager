import { UuidGeradorDeId } from './uuid-gerador-de-id';

describe('UuidGeradorDeId', () => {
  it('gera ids no formato UUID', () => {
    const id = new UuidGeradorDeId().novo();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('gera ids distintos a cada chamada', () => {
    const gerador = new UuidGeradorDeId();
    expect(gerador.novo()).not.toBe(gerador.novo());
  });
});
