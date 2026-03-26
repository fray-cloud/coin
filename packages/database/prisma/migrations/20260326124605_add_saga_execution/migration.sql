-- CreateTable
CREATE TABLE "SagaExecution" (
    "id" TEXT NOT NULL,
    "sagaType" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "context" JSONB NOT NULL,
    "completedSteps" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SagaExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SagaExecution_correlationId_key" ON "SagaExecution"("correlationId");

-- CreateIndex
CREATE INDEX "SagaExecution_status_expiresAt_idx" ON "SagaExecution"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "SagaExecution_sagaType_status_idx" ON "SagaExecution"("sagaType", "status");
