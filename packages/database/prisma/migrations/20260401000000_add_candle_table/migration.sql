-- CreateTable
CREATE TABLE "Candle" (
    "id" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Candle_exchange_symbol_interval_idx" ON "Candle"("exchange", "symbol", "interval");

-- CreateIndex
CREATE INDEX "Candle_exchange_symbol_interval_timestamp_idx" ON "Candle"("exchange", "symbol", "interval", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Candle_exchange_symbol_interval_timestamp_key" ON "Candle"("exchange", "symbol", "interval", "timestamp");
