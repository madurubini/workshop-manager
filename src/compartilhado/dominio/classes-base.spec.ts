import { AgregadoRaiz } from './agregado-raiz';
import { EntidadeBase } from './entidade-base';
import { EventoDominio } from './evento-dominio';

class Carro extends EntidadeBase<string> {}
class Moto extends EntidadeBase<string> {}

class TesteCriado extends EventoDominio {
  constructor(readonly agregadoId: string) {
    super();
  }
  get nomeEvento(): string {
    return 'teste.criado';
  }
}

class Pedido extends AgregadoRaiz<string> {
  criar(): void {
    this.registrarEvento(new TesteCriado(this.id));
  }
}

describe('EntidadeBase', () => {
  it('considera iguais entidades de mesmo tipo e mesmo id', () => {
    expect(new Carro('1').igualA(new Carro('1'))).toBe(true);
  });

  it('considera diferentes ids distintos', () => {
    expect(new Carro('1').igualA(new Carro('2'))).toBe(false);
  });

  it('considera diferentes tipos distintos mesmo com id igual', () => {
    const carro = new Carro('1');
    const moto = new Moto('1') as unknown as EntidadeBase<string>;
    expect(carro.igualA(moto)).toBe(false);
  });

  it('é igual a si mesma e diferente de undefined', () => {
    const carro = new Carro('1');
    expect(carro.igualA(carro)).toBe(true);
    expect(carro.igualA(undefined)).toBe(false);
  });

  it('expõe o id', () => {
    expect(new Carro('abc').id).toBe('abc');
  });
});

describe('AgregadoRaiz e EventoDominio', () => {
  it('acumula eventos registrados', () => {
    const pedido = new Pedido('p1');
    pedido.criar();
    expect(pedido.eventos).toHaveLength(1);
    expect(pedido.eventos[0].nomeEvento).toBe('teste.criado');
    expect(pedido.eventos[0].ocorridoEm).toBeInstanceOf(Date);
  });

  it('puxarEventos devolve os pendentes e limpa a fila', () => {
    const pedido = new Pedido('p1');
    pedido.criar();
    const eventos = pedido.puxarEventos();
    expect(eventos).toHaveLength(1);
    expect(pedido.eventos).toHaveLength(0);
    expect(pedido.puxarEventos()).toHaveLength(0);
  });
});
