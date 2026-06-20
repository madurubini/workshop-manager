-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" UUID NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculo" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servico" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "precoBase" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peca" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "precoUnitario" DECIMAL(10,2) NOT NULL,
    "saldoFisico" INTEGER NOT NULL DEFAULT 0,
    "reservado" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "peca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva_estoque" (
    "id" UUID NOT NULL,
    "pecaId" UUID NOT NULL,
    "ordemId" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserva_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacao" (
    "id" UUID NOT NULL,
    "pecaId" UUID NOT NULL,
    "ordemId" UUID NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "prazoDias" INTEGER NOT NULL,
    "fornecedor" TEXT,
    "recebidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordem_servico" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" UUID NOT NULL,
    "veiculoId" UUID NOT NULL,
    "problemaRelatado" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEBIDA',
    "versao" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciadoExecucaoEm" TIMESTAMP(3),
    "finalizadoEm" TIMESTAMP(3),
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "pagoEm" TIMESTAMP(3),

    CONSTRAINT "ordem_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamento" (
    "id" UUID NOT NULL,
    "ordemId" UUID NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'INICIAL',
    "descricao" TEXT,
    "totalServicos" DECIMAL(10,2) NOT NULL,
    "totalPecas" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GERADO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoEm" TIMESTAMP(3),
    "respondidoEm" TIMESTAMP(3),

    CONSTRAINT "orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servico_orcado" (
    "id" UUID NOT NULL,
    "orcamentoId" UUID NOT NULL,
    "servicoId" UUID NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "precoAplicado" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "servico_orcado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peca_orcada" (
    "id" UUID NOT NULL,
    "orcamentoId" UUID NOT NULL,
    "pecaId" UUID NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoAplicado" DECIMAL(10,2) NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "peca_orcada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_status" (
    "id" UUID NOT NULL,
    "ordemId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "por" TEXT,

    CONSTRAINT "historico_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_username_key" ON "usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_documento_key" ON "cliente"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "veiculo_placa_key" ON "veiculo"("placa");

-- CreateIndex
CREATE INDEX "veiculo_clienteId_idx" ON "veiculo"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "peca_codigo_key" ON "peca"("codigo");

-- CreateIndex
CREATE INDEX "reserva_estoque_ordemId_idx" ON "reserva_estoque"("ordemId");

-- CreateIndex
CREATE INDEX "reserva_estoque_pecaId_idx" ON "reserva_estoque"("pecaId");

-- CreateIndex
CREATE UNIQUE INDEX "ordem_servico_numero_key" ON "ordem_servico"("numero");

-- CreateIndex
CREATE INDEX "ordem_servico_clienteId_idx" ON "ordem_servico"("clienteId");

-- CreateIndex
CREATE INDEX "ordem_servico_veiculoId_idx" ON "ordem_servico"("veiculoId");

-- CreateIndex
CREATE INDEX "ordem_servico_status_idx" ON "ordem_servico"("status");

-- CreateIndex
CREATE INDEX "orcamento_ordemId_idx" ON "orcamento"("ordemId");

-- CreateIndex
CREATE INDEX "servico_orcado_orcamentoId_idx" ON "servico_orcado"("orcamentoId");

-- CreateIndex
CREATE INDEX "peca_orcada_orcamentoId_idx" ON "peca_orcada"("orcamentoId");

-- CreateIndex
CREATE INDEX "historico_status_ordemId_idx" ON "historico_status"("ordemId");

-- AddForeignKey
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_estoque" ADD CONSTRAINT "reserva_estoque_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "peca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_estoque" ADD CONSTRAINT "reserva_estoque_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "ordem_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao" ADD CONSTRAINT "cotacao_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "peca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao" ADD CONSTRAINT "cotacao_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "ordem_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento" ADD CONSTRAINT "orcamento_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "ordem_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servico_orcado" ADD CONSTRAINT "servico_orcado_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "orcamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servico_orcado" ADD CONSTRAINT "servico_orcado_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peca_orcada" ADD CONSTRAINT "peca_orcada_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "orcamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peca_orcada" ADD CONSTRAINT "peca_orcada_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "peca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "ordem_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

