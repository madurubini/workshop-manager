import { AgregadoRaiz } from '../../compartilhado/dominio/agregado-raiz';
import {
  ErroTransicaoInvalida,
  ErroValidacao,
} from '../../compartilhado/erros/erros-dominio';
import {
  DiagnosticoConcluido,
  OrcamentoGerado,
  OSAberta,
  StatusOSAlterado,
} from './eventos';
import {
  arredondar2,
  ItemPeca,
  ItemServico,
  Orcamento,
  StatusOrcamento,
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
  criadoEm: Date;
  historico: RegistroHistorico[];
  itensServico: ItemServico[];
  itensPeca: ItemPeca[];
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
      criadoEm: agora,
      historico: [
        { status: StatusOS.RECEBIDA, em: agora, por: entrada.por ?? null },
      ],
      itensServico: [],
      itensPeca: [],
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
  get orcamento(): Orcamento | null {
    return this.props.orcamento;
  }
}
