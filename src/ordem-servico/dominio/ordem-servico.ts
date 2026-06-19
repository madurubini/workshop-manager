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
  StatusOSAlterado,
  VeiculoEntregue,
} from './eventos';
import {
  calcularTotais,
  Orcamento,
  PecaOrcada,
  ServicoOrcado,
  SituacaoPecaOrcada,
  StatusOrcamento,
  TipoOrcamento,
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
  orcamentos: Orcamento[];
}

/**
 * Raiz de agregado Ordem de Serviço — núcleo do sistema. Carrega o ciclo de
 * vida inteiro (do recebimento à entrega) e é a guardiã da máquina de estados:
 * toda mudança de status passa por `transicionarPara`, que rejeita transições
 * inválidas e grava o histórico.
 *
 * Uma OS tem vários orçamentos: um INICIAL (do diagnóstico) e zero ou mais
 * ADICIONAL (reparos descobertos na execução). Aprovar/recusar o INICIAL move o
 * status da OS; os ADICIONAL apenas liberam (ou não) o trabalho extra, sem
 * mudar o status. A OS só finaliza quando NENHUM orçamento está pendente.
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
      orcamentos: [],
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
   * Registra o diagnóstico: cria o orçamento INICIAL (com as linhas já
   * precificadas pela aplicação — preços congelados) e leva a OS de Recebida
   * para Em diagnóstico. Se a OS não estiver em Recebida, a própria máquina de
   * estados rejeita (HTTP 422).
   */
  registrarDiagnostico(entrada: {
    servicos: ServicoOrcado[];
    pecas: PecaOrcada[];
    orcamentoId: string;
    por?: string | null;
  }): void {
    if (entrada.servicos.length === 0 && entrada.pecas.length === 0) {
      throw new ErroValidacao(
        'O diagnóstico precisa de ao menos um serviço ou peça.',
      );
    }
    if (this.orcamentoInicial()) {
      throw new ErroValidacao('Esta OS já tem orçamento inicial.');
    }

    this.transicionarPara(StatusOS.EM_DIAGNOSTICO, entrada.por);

    const orcamento: Orcamento = {
      id: entrada.orcamentoId,
      tipo: TipoOrcamento.INICIAL,
      descricao: null,
      totalServicos: 0,
      totalPecas: 0,
      total: 0,
      status: StatusOrcamento.GERADO,
      criadoEm: new Date(),
      enviadoEm: null,
      respondidoEm: null,
      servicos: entrada.servicos,
      pecas: entrada.pecas,
    };
    calcularTotais(orcamento);
    this.props.orcamentos.push(orcamento);

    this.registrarEvento(new DiagnosticoConcluido(this.id));
    this.registrarEvento(
      new OrcamentoGerado(
        this.id,
        orcamento.id,
        orcamento.tipo,
        orcamento.total,
      ),
    );
  }

  /** Envia o orçamento INICIAL ao cliente: GERADO → ENVIADO; OS → Aguardando aprovação. */
  enviarOrcamento(por?: string | null): void {
    const orcamento = this.orcamentoInicial();
    if (!orcamento) {
      throw new ErroValidacao('Esta OS ainda não tem orçamento inicial.');
    }
    if (orcamento.status !== StatusOrcamento.GERADO) {
      throw new ErroTransicaoInvalida(
        `Orçamento precisa estar GERADO; está ${orcamento.status}.`,
      );
    }
    orcamento.status = StatusOrcamento.ENVIADO;
    orcamento.enviadoEm = new Date();
    this.transicionarPara(StatusOS.AGUARDANDO_APROVACAO, por);
    this.registrarEvento(
      new OrcamentoEnviado(
        this.id,
        this.props.numero,
        orcamento.id,
        orcamento.tipo,
      ),
    );
  }

  /**
   * Cliente APROVA um orçamento (inicial ou adicional). Marca as peças daquele
   * orçamento (DISPONIVEL → RESERVADA, EM_COTACAO → ENCOMENDADA) e emite o
   * evento com a situação ORIGINAL, para o Estoque reservar/encomendar.
   * Se for o INICIAL, leva a OS para Em execução; se for ADICIONAL, a OS
   * continua em execução (só libera o trabalho extra).
   */
  aprovarOrcamento(orcamentoId: string, por?: string | null): void {
    const orcamento = this.orcamentoNoEstado(
      orcamentoId,
      StatusOrcamento.ENVIADO,
    );

    const itensParaEstoque = this.capturarPecasParaEstoque(orcamento);

    orcamento.status = StatusOrcamento.APROVADO;
    orcamento.respondidoEm = new Date();
    this.reservarPecasDoOrcamento(orcamento);

    if (orcamento.tipo === TipoOrcamento.INICIAL) {
      this.props.iniciadoExecucaoEm = new Date();
      this.transicionarPara(StatusOS.EM_EXECUCAO, por);
    }

    this.registrarEvento(
      new OrcamentoAprovado(
        this.id,
        orcamento.id,
        orcamento.tipo,
        itensParaEstoque,
      ),
    );
  }

  /**
   * Cliente RECUSA um orçamento. INICIAL → OS Cancelada; ADICIONAL → apenas
   * marca recusado (o trabalho extra não é feito) e a OS segue em execução.
   */
  recusarOrcamento(
    orcamentoId: string,
    justificativa?: string | null,
    por?: string | null,
  ): void {
    const orcamento = this.orcamentoNoEstado(
      orcamentoId,
      StatusOrcamento.ENVIADO,
    );
    orcamento.status = StatusOrcamento.RECUSADO;
    orcamento.respondidoEm = new Date();

    if (orcamento.tipo === TipoOrcamento.INICIAL) {
      this.transicionarPara(StatusOS.CANCELADA, por);
    }

    this.registrarEvento(
      new OrcamentoRecusado(
        this.id,
        orcamento.id,
        orcamento.tipo,
        justificativa ?? null,
      ),
    );
  }

  /**
   * Lança um orçamento ADICIONAL durante a execução (o antigo "reparo
   * adicional"). Nasce já ENVIADO, aguardando o cliente. A OS continua Em
   * execução. As linhas já vêm com preço congelado pela aplicação.
   */
  adicionarOrcamentoAdicional(entrada: {
    id: string;
    descricao: string;
    servicos: ServicoOrcado[];
    pecas: PecaOrcada[];
    por?: string | null;
  }): void {
    if (this.props.status !== StatusOS.EM_EXECUCAO) {
      throw new ErroTransicaoInvalida(
        'Orçamento adicional só pode ser lançado com a OS em execução.',
      );
    }
    if (entrada.servicos.length === 0 && entrada.pecas.length === 0) {
      throw new ErroValidacao(
        'Orçamento adicional precisa de ao menos um serviço ou peça.',
      );
    }

    const agora = new Date();
    const orcamento: Orcamento = {
      id: entrada.id,
      tipo: TipoOrcamento.ADICIONAL,
      descricao: entrada.descricao,
      totalServicos: 0,
      totalPecas: 0,
      total: 0,
      status: StatusOrcamento.ENVIADO,
      criadoEm: agora,
      enviadoEm: agora,
      respondidoEm: null,
      servicos: entrada.servicos,
      pecas: entrada.pecas,
    };
    calcularTotais(orcamento);
    this.props.orcamentos.push(orcamento);

    this.registrarEvento(
      new OrcamentoGerado(
        this.id,
        orcamento.id,
        orcamento.tipo,
        orcamento.total,
      ),
    );
    this.registrarEvento(
      new OrcamentoEnviado(
        this.id,
        this.props.numero,
        orcamento.id,
        orcamento.tipo,
      ),
    );
  }

  /**
   * Mecânico conclui a execução. Bloqueia se houver orçamento aguardando
   * resposta (regra: só finaliza sem orçamento pendente). Registra o tempo e
   * leva a OS para Finalizada; o evento dispara a baixa do estoque das peças
   * reservadas.
   */
  concluirExecucao(por?: string | null): void {
    if (this.temOrcamentoPendente()) {
      throw new ErroValidacao(
        'Há orçamento aguardando resposta do cliente; não é possível concluir.',
      );
    }
    this.props.finalizadoEm = new Date();
    this.transicionarPara(StatusOS.FINALIZADA, por);
    this.registrarEvento(
      new ExecucaoConcluida(this.id, this.tempoExecucaoMinutos()),
    );
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

  // ───────────────────────────── internos ─────────────────────────────

  private orcamentoInicial(): Orcamento | undefined {
    return this.props.orcamentos.find((o) => o.tipo === TipoOrcamento.INICIAL);
  }

  /** Acha um orçamento por id e garante que está no estado esperado. */
  private orcamentoNoEstado(
    orcamentoId: string,
    esperado: StatusOrcamento,
  ): Orcamento {
    const orcamento = this.props.orcamentos.find((o) => o.id === orcamentoId);
    if (!orcamento) {
      throw new ErroNaoEncontrado('Orçamento não encontrado.', { orcamentoId });
    }
    if (orcamento.status !== esperado) {
      throw new ErroTransicaoInvalida(
        `Orçamento precisa estar ${esperado}; está ${orcamento.status}.`,
      );
    }
    return orcamento;
  }

  /** Snapshot das peças do orçamento (situação original) para o Estoque. */
  private capturarPecasParaEstoque(orcamento: Orcamento): ItemPecaAprovado[] {
    return orcamento.pecas.map((i) => ({
      pecaId: i.pecaId,
      quantidade: i.quantidade,
      situacao:
        i.situacao === SituacaoPecaOrcada.DISPONIVEL
          ? 'DISPONIVEL'
          : 'EM_COTACAO',
    }));
  }

  /** Atualiza a situação das peças do orçamento aprovado. */
  private reservarPecasDoOrcamento(orcamento: Orcamento): void {
    for (const item of orcamento.pecas) {
      item.situacao =
        item.situacao === SituacaoPecaOrcada.DISPONIVEL
          ? SituacaoPecaOrcada.RESERVADA
          : SituacaoPecaOrcada.ENCOMENDADA;
    }
  }

  /** Há orçamento ainda não decidido pelo cliente (GERADO ou ENVIADO)? */
  private temOrcamentoPendente(): boolean {
    return this.props.orcamentos.some(
      (o) =>
        o.status === StatusOrcamento.GERADO ||
        o.status === StatusOrcamento.ENVIADO,
    );
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

  // ───────────────────────────── getters ─────────────────────────────

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
  get orcamentos(): readonly Orcamento[] {
    return this.props.orcamentos;
  }
  /** Orçamento inicial (do diagnóstico), se já existir. */
  get orcamento(): Orcamento | null {
    return this.orcamentoInicial() ?? null;
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
