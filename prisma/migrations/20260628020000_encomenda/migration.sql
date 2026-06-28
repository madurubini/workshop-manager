-- CreateTable
CREATE TABLE "encomenda" (
    "id" UUID NOT NULL,
    "pecaId" UUID NOT NULL,
    "ordemId" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recebidaEm" TIMESTAMP(3),

    CONSTRAINT "encomenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "encomenda_pecaId_status_idx" ON "encomenda"("pecaId", "status");

-- CreateIndex
CREATE INDEX "encomenda_ordemId_idx" ON "encomenda"("ordemId");

-- AddForeignKey
ALTER TABLE "encomenda" ADD CONSTRAINT "encomenda_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "peca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encomenda" ADD CONSTRAINT "encomenda_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "ordem_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
