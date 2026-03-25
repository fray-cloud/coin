-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "tradingMode" TEXT NOT NULL DEFAULT 'paper',
    "exchangeKeyId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "riskConfig" JSONB NOT NULL DEFAULT '{}',
    "intervalSeconds" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyLog" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "signal" TEXT,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Strategy_userId_idx" ON "Strategy"("userId");

-- CreateIndex
CREATE INDEX "Strategy_userId_enabled_idx" ON "Strategy"("userId", "enabled");

-- CreateIndex
CREATE INDEX "StrategyLog_strategyId_idx" ON "StrategyLog"("strategyId");

-- CreateIndex
CREATE INDEX "StrategyLog_strategyId_createdAt_idx" ON "StrategyLog"("strategyId", "createdAt");

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_exchangeKeyId_fkey" FOREIGN KEY ("exchangeKeyId") REFERENCES "ExchangeKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyLog" ADD CONSTRAINT "StrategyLog_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
