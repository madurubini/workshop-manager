import { AgregadoRaiz } from '../../compartilhado/dominio/agregado-raiz';
import {
  ErroNaoEncontrado,
  ErroTransicaoInvalida,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import {
  DiagnosticoConcluido,
  ExecucaoConcluida,
  ItemPecaAprovado,
  OrcamentoAprovado,
  OrcamentoEnviado,
  OrcamentoGerado,
  OrcamentoRecusado,
  OSAberta,
  PagamentoConfirmado,
  ReparoAdicionalLancado,
  ReparoAprovado,
  ReparoRecusado,
  StatusOSAlterado,
  VeiculoEntregue,
} from './eventos';
import {
  arredondar2,
  ItemPeca,
  ItemServico,
  Orcamento,
  ReparoAdicional,
  SituacaoItemPeca,
  StatusOrcamento,
  StatusReparo,
} from './itens';
import { StatusOS, transicaoPermitida } from './status-os';

export interface RegistroHistorico {
  status: StatusOS;
  em: Date;
  por: string | null;
}

interface PropsOrdemServico {
  numero: string;
  clienteId: string;
  veiculoId: string;
  problemaRelatado: string;
  status: StatusOS;
  versao: number;
  pago: boolean;
  pagoEm: Date | null;
  criadoEm: Date;
  iniciadoExecucaoEm: Date | null;
  finalizadoEm: Date | null;
  historico: RegistroHistorico[];
  itensServico: ItemServico[];
  itensPeca: ItemPeca[];
  reparos: ReparoAdicional[];
  orcamento: Orcamento | null;
}

/**
 * Raiz de agregado Ordem de Serviço — núcleo do sistema. Carrega o ciclo de
 * vida inteiro (do recebimento à entrega) e é a guardiã da máquina de estados:
 * toda mudança de status passa por `transicionarPara`, que rejeita transições
 * inválidas e grava o histórico. Orçamento, itens e reparos entram nas
 * próximas fases.
 */
export class OrdemServico extends AgregadoRaiz<string> {
  private constructor(
    id: string,
    private props: PropsOrdemServico,
  ) {
    super(id);
  }

  /** Abre uma nova OS no estado Recebida (CMD "Abrir OS"). */
  static abrir(entrada: {
    id: string;
    numero: string;
    clienteId: string;
    veiculoId: string;
    problemaRelatado: string;
    por?: string | null;
  }): OrdemServico {
    if (!entrada.problemaRelatado || !entrada.problemaRelatado.trim()) {
      throw new ErroValidacao('Problema relatado é obrigatório.');
    }
    const agora = new Date();
    const os = new OrdemServico(entrada.id, {
      numero: entrada.numero,
      clienteId: entrada.clienteId,
      veiculoId: entrada.veiculoId,
      problemaRelatado: entrada.problemaRelatado.trim(),
      status: StatusOS.RECEBIDA,
      versao: 0,
      pago: false,
      pagoEm: null,
      criadoEm: agora,
      iniciadoExecucaoEm: null,
      finalizadoEm: null,
      historico: [
        { status: StatusOS.RECEBIDA, em: agora, por: entrada.por ?? null },
      ],
      itensServico: [],
      itensPeca: [],
      reparos: [],
      orcamento: null,
    });
    os.registrarEvento(new OSAberta(os.id, os.numero));
    return os;
  }

  /** Reconstrói a OS a partir do que está persistido (sem eventos). */
  static restaurar(id: string, props: PropsOrdemServico): OrdemServico {
    return new OrdemServico(id, props);
  }

  /**
   * Transição de status protegida pela máquina de estados. Rejeita transições
   * fora da ordem válida, grava o histórico e registra o evento.
   */
  transicionarPara(novo: StatusOS, por?: string | null): void {
    if (!transicaoPermitida(this.props.status, novo)) {
      throw new ErroTransicaoInvalida(
        `Transição inválida: de ${this.props.status} para ${novo}.`,
      );
    }
    const anterior = this.props.status;
    this.props.status = novo;
    this.props.historico.push({
      status: novo,
      em: new Date(),
      por: por ?? null,
    });
    this.registrarEvento(new StatusOSAlterado(this.id, anterior, novo));
  }

  /**
   * Registra o diagnóstico: grava os itens (com preços já congelados pela
   * aplicação), gera o orçamento (totais calculados aqui — regra de domínio) e
   * leva a OS de Recebida para Em diagnóstico. Se a OS não estiver em Recebida,
   * a própria máquina de estados rejeita (HTTP 422).
   */
  registrarDiagnostico(entrada: {
    itensServico: ItemServico[];
    itensPeca: ItemPeca[];
    orcamentoId: string;
    por?: string | null;
  }): void {
    if (entrada.itensServico.length === 0 && entrada.itensPeca.length === 0) {
      throw new ErroValidacao(
        'O diagnóstico precisa de ao menos um serviço ou peça.',
      );
    }

    this.transicionarPara(StatusOS.EM_DIAGNOSTICO, entrada.por);

    this.props.itensServico = entrada.itensServico;
    this.props.itensPeca = entrada.itensPeca;

    const totalServicos = arredondar2(
      entrada.itensServico.reduce(
        (soma, i) => soma + i.precoAplicado * i.quantidade,
        0,
      ),
    );
    const totalPecas = arredondar2(
      entrada.itensPeca.reduce(
        (soma, i) => soma + i.precoAplicado * i.quantidade,
        0,
      ),
    );

    this.props.orcamento = {
      id: entrada.orcamentoId,
      totalServicos,
      totalPecas,
      total: arredondar2(totalServicos + totalPecas),
      status: StatusOrcamento.GERADO,
      enviadoEm: null,
      respondidoEm: null,
    };

    this.registrarEvento(new DiagnosticoConcluido(this.id));
    this.registrarEvento(
      new OrcamentoGerado(
        this.id,
        this.props.orcamento.id,
        this.props.orcamento.total,
      ),
    );
  }

  /** Envia o orçamento ao cliente: GERADO → ENVIADO; OS → Aguardando aprovação. */
  enviarOrcamento(por?: string | null): void {
    const orcamento = this.orcamentoNoEstado(StatusOrcamento.GERADO);
    orcamento.status = StatusOrcamento.ENVIADO;
    orcamento.enviadoEm = new Date();
    this.transicionarPara(StatusOS.AGUARDANDO_APROVACAO, por);
    this.registrarEvento(new OrcamentoEnviado(this.id, this.props.numero));
  }

  /**
   * Cliente aprova o orçamento: ENVIADO → APROVADO; OS → Em execução. Marca os
   * itens (DISPONIVEL → RESERVADA, EM_COTACAO → ENCOMENDADA) e emite o evento
   * com a situação ORIGINAL, para o Estoque reservar/encomendar.
   */
  aprovarOrcamento(por?: string | null): void {
    const orcamento = this.orcamentoNoEstado(StatusOrcamento.ENVIADO);

    // Captura a situação original antes de alterar (o Estoque precisa dela).
    const itensParaEstoque: ItemPecaAprovado[] = this.props.itensPeca.map(
      (i) => ({
        pecaId: i.pecaId,
        quantidade: i.quantidade,
        situacao:
          i.situacao === SituacaoItemPeca.DISPONIVEL
            ? 'DISPONIVEL'
            : 'EM_COTACAO',
      }),
    );

    orcamento.status = StatusOrcamento.APROVADO;
    orcamento.respondidoEm = new Date();

    for (const item of this.props.itensPeca) {
      item.situacao =
        item.situacao === SituacaoItemPeca.DISPONIVEL
          ? SituacaoItemPeca.RESERVADA
          : SituacaoItemPeca.ENCOMENDADA;
    }

    this.props.iniciadoExecucaoEm = new Date();
    this.transicionarPara(StatusOS.EM_EXECUCAO, por);
    this.registrarEvento(new OrcamentoAprovado(this.id, itensParaEstoque));
  }

  /** Cliente recusa o orçamento: ENVIADO → RECUSADO; OS → Cancelada. */
  recusarOrcamento(justificativa?: string | null, por?: string | null): void {
    const orcamento = this.orcamentoNoEstado(StatusOrcamento.ENVIADO);
    orcamento.status = StatusOrcamento.RECUSADO;
    orcamento.respondidoEm = new Date();
    this.transicionarPara(StatusOS.CANCELADA, por);
    this.registrarEvento(new OrcamentoRecusado(this.id, justificativa ?? null));
  }

  /**
   * Mecânico conclui a execução. Bloqueia se houver reparo aguardando resposta
   * (regra: só finaliza sem reparo pendente). Registra o tempo e leva a OS para
   * Finalizada; o evento dispara a baixa do estoque das peças reservadas.
   */
  concluirExecucao(por?: string | null): void {
    if (this.temReparoPendente()) {
      throw new ErroValidacao(
        'Há reparo adicional aguardando resposta do cliente; não é possível concluir.',
      );
    }
    this.props.finalizadoEm = new Date();
    this.transicionarPara(StatusOS.FINALIZADA, por);
    this.registrarEvento(
      new ExecucaoConcluida(this.id, this.tempoExecucaoMinutos()),
    );
  }

  /**
   * Lança um reparo adicional durante a execução (itens com preço já congelado
   * pela aplicação). Atualiza o orçamento e emite o evento que pede autorização
   * ao cliente. A OS continua Em execução; o reparo nasce AGUARDANDO.
   */
  adicionarReparo(entrada: {
    id: string;
    descricao: string;
    itensServico: ItemServico[];
    itensPeca: ItemPeca[];
  }): void {
    if (this.props.status !== StatusOS.EM_EXECUCAO) {
      throw new ErroTransicaoInvalida(
        'Reparo adicional só pode ser lançado com a OS em execução.',
      );
    }
    if (entrada.itensServico.length === 0 && entrada.itensPeca.length === 0) {
      throw new ErroValidacao('Reparo precisa de ao menos um serviço ou peça.');
    }

    const itensServico = entrada.itensServico.map((i) => ({
      ...i,
      reparoId: entrada.id,
    }));
    const itensPeca = entrada.itensPeca.map((i) => ({
      ...i,
      reparoId: entrada.id,
    }));
    const total = arredondar2(
      [...itensServico, ...itensPeca].reduce(
        (soma, i) => soma + i.precoAplicado * i.quantidade,
        0,
      ),
    );

    this.props.reparos.push({
      id: entrada.id,
      descricao: entrada.descricao,
      total,
      status: StatusReparo.AGUARDANDO,
      criadoEm: new Date(),
      respondidoEm: null,
    });
    this.props.itensServico.push(...itensServico);
    this.props.itensPeca.push(...itensPeca);
    this.recalcularOrcamento();

    this.registrarEvento(new ReparoAdicionalLancado(this.id, entrada.id));
  }

  /** Cliente aprova o reparo: peças do reparo viram reservada/encomendada. */
  aprovarReparo(reparoId: string): void {
    const reparo = this.reparoNoEstado(reparoId, StatusReparo.AGUARDANDO);
    const itensDoReparo = this.props.itensPeca.filter(
      (i) => i.reparoId === reparoId,
    );
    const payload: ItemPecaAprovado[] = itensDoReparo.map((i) => ({
      pecaId: i.pecaId,
      quantidade: i.quantidade,
      situacao:
        i.situacao === SituacaoItemPeca.DISPONIVEL
          ? 'DISPONIVEL'
          : 'EM_COTACAO',
    }));

    reparo.status = StatusReparo.APROVADO;
    reparo.respondidoEm = new Date();
    for (const item of itensDoReparo) {
      item.situacao =
        item.situacao === SituacaoItemPeca.DISPONIVEL
          ? SituacaoItemPeca.RESERVADA
          : SituacaoItemPeca.ENCOMENDADA;
    }
    this.registrarEvento(new ReparoAprovado(this.id, reparoId, payload));
  }

  /** Cliente recusa o reparo: remove seus itens e segue só com o aprovado. */
  recusarReparo(reparoId: string): void {
    const reparo = this.reparoNoEstado(reparoId, StatusReparo.AGUARDANDO);
    reparo.status = StatusReparo.RECUSADO;
    reparo.respondidoEm = new Date();
    this.props.itensServico = this.props.itensServico.filter(
      (i) => i.reparoId !== reparoId,
    );
    this.props.itensPeca = this.props.itensPeca.filter(
      (i) => i.reparoId !== reparoId,
    );
    this.recalcularOrcamento();
    this.registrarEvento(new ReparoRecusado(this.id, reparoId));
  }

  /**
   * Confirma o pagamento (manual): apenas marca a flag e libera a entrega.
   * Só após a OS estar Finalizada. Não é uma transição de status.
   */
  marcarPago(): void {
    if (this.props.status !== StatusOS.FINALIZADA) {
      throw new ErroTransicaoInvalida(
        'O pagamento só pode ser confirmado com a OS finalizada.',
      );
    }
    if (this.props.pago) {
      throw new ErroValidacao('Esta OS já está paga.');
    }
    this.props.pago = true;
    this.props.pagoEm = new Date();
    this.registrarEvento(new PagamentoConfirmado(this.id));
  }

  /**
   * Entrega o veículo e encerra a OS (Finalizada → Entregue). Exige pagamento
   * confirmado — regra: reter o veículo até o pagamento.
   */
  entregar(por?: string | null): void {
    if (!this.props.pago) {
      throw new ErroValidacao(
        'A entrega exige pagamento confirmado (pago = true).',
      );
    }
    this.transicionarPara(StatusOS.ENTREGUE, por);
    this.registrarEvento(new VeiculoEntregue(this.id, this.props.numero));
  }

  /** Garante que existe orçamento e que ele está no estado esperado. */
  private orcamentoNoEstado(esperado: StatusOrcamento): Orcamento {
    if (!this.props.orcamento) {
      throw new ErroValidacao('Esta OS ainda não tem orçamento.');
    }
    if (this.props.orcamento.status !== esperado) {
      throw new ErroTransicaoInvalida(
        `Orçamento precisa estar ${esperado}; está ${this.props.orcamento.status}.`,
      );
    }
    return this.props.orcamento;
  }

  private reparoNoEstado(
    reparoId: string,
    esperado: StatusReparo,
  ): ReparoAdicional {
    const reparo = this.props.reparos.find((r) => r.id === reparoId);
    if (!reparo) {
      throw new ErroNaoEncontrado('Reparo adicional não encontrado.', {
        reparoId,
      });
    }
    if (reparo.status !== esperado) {
      throw new ErroTransicaoInvalida(
        `Reparo precisa estar ${esperado}; está ${reparo.status}.`,
      );
    }
    return reparo;
  }

  private temReparoPendente(): boolean {
    return this.props.reparos.some((r) => r.status === StatusReparo.AGUARDANDO);
  }

  /** Recalcula os totais do orçamento a partir de todos os itens atuais. */
  private recalcularOrcamento(): void {
    if (!this.props.orcamento) {
      return;
    }
    const totalServicos = arredondar2(
      this.props.itensServico.reduce(
        (soma, i) => soma + i.precoAplicado * i.quantidade,
        0,
      ),
    );
    const totalPecas = arredondar2(
      this.props.itensPeca.reduce(
        (soma, i) => soma + i.precoAplicado * i.quantidade,
        0,
      ),
    );
    this.props.orcamento.totalServicos = totalServicos;
    this.props.orcamento.totalPecas = totalPecas;
    this.props.orcamento.total = arredondar2(totalServicos + totalPecas);
  }

  private tempoExecucaoMinutos(): number | null {
    if (!this.props.iniciadoExecucaoEm || !this.props.finalizadoEm) {
      return null;
    }
    const ms =
      this.props.finalizadoEm.getTime() -
      this.props.iniciadoExecucaoEm.getTime();
    return Math.round(ms / 60000);
  }

  get numero(): string {
    return this.props.numero;
  }
  get clienteId(): string {
    return this.props.clienteId;
  }
  get veiculoId(): string {
    return this.props.veiculoId;
  }
  get problemaRelatado(): string {
    return this.props.problemaRelatado;
  }
  get status(): StatusOS {
    return this.props.status;
  }
  get versao(): number {
    return this.props.versao;
  }
  get pago(): boolean {
    return this.props.pago;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get historico(): readonly RegistroHistorico[] {
    return this.props.historico;
  }
  get itensServico(): readonly ItemServico[] {
    return this.props.itensServico;
  }
  get itensPeca(): readonly ItemPeca[] {
    return this.props.itensPeca;
  }
  get reparos(): readonly ReparoAdicional[] {
    return this.props.reparos;
  }
  get orcamento(): Orcamento | null {
    return this.props.orcamento;
  }
  get iniciadoExecucaoEm(): Date | null {
    return this.props.iniciadoExecucaoEm;
  }
  get finalizadoEm(): Date | null {
    return this.props.finalizadoEm;
  }
  get pagoEm(): Date | null {
    return this.props.pagoEm;
  }
}
