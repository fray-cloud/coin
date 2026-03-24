-- CreateTable
CREATE TABLE "ExchangeKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeKey_userId_idx" ON "ExchangeKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeKey_userId_exchange_key" ON "ExchangeKey"("userId", "exchange");

-- AddForeignKey
ALTER TABLE "ExchangeKey" ADD CONSTRAINT "ExchangeKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
