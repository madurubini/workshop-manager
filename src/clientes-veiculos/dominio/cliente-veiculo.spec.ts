import { ErroValidacao } from '../../compartilhado/erros/erros-dominio';
import { Cliente } from './cliente';
import { Veiculo } from './veiculo';

describe('Cliente', () => {
  it('cadastra com documento válido e registra evento', () => {
    const cliente = Cliente.cadastrar({
      id: 'c1',
      documento: '529.982.247-25',
      nome: '  Maria  ',
      email: 'maria@x.com',
    });
    expect(cliente.nome).toBe('Maria');
    expect(cliente.documento.tipo).toBe('CPF');
    expect(cliente.ativo).toBe(true);
    expect(cliente.email).toBe('maria@x.com');
    expect(cliente.telefone).toBeNull();
    expect(cliente.puxarEventos()).toHaveLength(1);
  });

  it('exige nome', () => {
    expect(() =>
      Cliente.cadastrar({ id: 'c1', documento: '52998224725', nome: '  ' }),
    ).toThrow(ErroValidacao);
  });

  it('inativa (soft delete)', () => {
    const cliente = Cliente.cadastrar({
      id: 'c1',
      documento: '52998224725',
      nome: 'Maria',
    });
    cliente.inativar();
    expect(cliente.ativo).toBe(false);
  });

  it('atualiza dados de contato (documento imutável)', () => {
    const cliente = Cliente.cadastrar({
      id: 'c1',
      documento: '52998224725',
      nome: 'Maria',
    });
    cliente.atualizarDados({ nome: '  Maria Silva  ', telefone: '119' });
    expect(cliente.nome).toBe('Maria Silva');
    expect(cliente.telefone).toBe('119');
    expect(cliente.documento.valor).toBe('52998224725');
  });

  it('rejeita nome vazio na atualização', () => {
    const cliente = Cliente.cadastrar({
      id: 'c1',
      documento: '52998224725',
      nome: 'Maria',
    });
    expect(() => cliente.atualizarDados({ nome: '  ' })).toThrow(ErroValidacao);
  });

  it('restaura a partir do persistido sem gerar eventos', () => {
    const criadoEm = new Date('2026-01-01');
    const cliente = Cliente.restaurar('c1', {
      documento: '52998224725',
      nome: 'Maria',
      email: null,
      telefone: '119',
      ativo: true,
      criadoEm,
    });
    expect(cliente.id).toBe('c1');
    expect(cliente.telefone).toBe('119');
    expect(cliente.criadoEm).toBe(criadoEm);
    expect(cliente.puxarEventos()).toHaveLength(0);
  });
});

describe('Veiculo', () => {
  const base = {
    id: 'v1',
    clienteId: 'c1',
    placa: 'ABC1234',
    marca: 'VW',
    modelo: 'Gol',
    ano: 2020,
  };

  it('registra com placa válida e vincula ao cliente', () => {
    const veiculo = Veiculo.registrar(base);
    expect(veiculo.clienteId).toBe('c1');
    expect(veiculo.placa.formato).toBe('ANTIGO');
    expect(veiculo.marca).toBe('VW');
    expect(veiculo.modelo).toBe('Gol');
    expect(veiculo.ano).toBe(2020);
    expect(veiculo.puxarEventos()).toHaveLength(1);
  });

  it('exige cliente', () => {
    expect(() => Veiculo.registrar({ ...base, clienteId: '' })).toThrow(
      ErroValidacao,
    );
  });

  it('exige marca e modelo', () => {
    expect(() => Veiculo.registrar({ ...base, marca: ' ' })).toThrow(
      ErroValidacao,
    );
  });

  it('rejeita ano fora da faixa', () => {
    expect(() => Veiculo.registrar({ ...base, ano: 1800 })).toThrow(
      ErroValidacao,
    );
    expect(() =>
      Veiculo.registrar({ ...base, ano: new Date().getFullYear() + 5 }),
    ).toThrow(ErroValidacao);
  });

  it('atualiza marca/modelo/ano (placa imutável)', () => {
    const veiculo = Veiculo.registrar(base);
    veiculo.atualizarDados({ modelo: 'Gol GTI', ano: 2021 });
    expect(veiculo.modelo).toBe('Gol GTI');
    expect(veiculo.ano).toBe(2021);
    expect(veiculo.placa.valor).toBe('ABC1234');
  });

  it('rejeita ano inválido na atualização', () => {
    const veiculo = Veiculo.registrar(base);
    expect(() => veiculo.atualizarDados({ ano: 1800 })).toThrow(ErroValidacao);
  });

  it('inativa e restaura', () => {
    const veiculo = Veiculo.registrar(base);
    veiculo.inativar();
    expect(veiculo.ativo).toBe(false);

    const restaurado = Veiculo.restaurar('v1', {
      clienteId: 'c1',
      placa: 'ABC1D23',
      marca: 'VW',
      modelo: 'Gol',
      ano: 2021,
      ativo: true,
      criadoEm: new Date(),
    });
    expect(restaurado.placa.formato).toBe('MERCOSUL');
    expect(restaurado.puxarEventos()).toHaveLength(0);
  });
});
