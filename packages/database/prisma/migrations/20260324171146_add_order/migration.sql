-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exchangeKeyId" TEXT,
    "exchange" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "quantity" TEXT NOT NULL,
    "price" TEXT,
    "exchangeOrderId" TEXT,
    "filledQuantity" TEXT NOT NULL DEFAULT '0',
    "filledPrice" TEXT NOT NULL DEFAULT '0',
    "fee" TEXT NOT NULL DEFAULT '0',
    "feeCurrency" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_exchangeOrderId_idx" ON "Order"("exchangeOrderId");

-- CreateIndex
CREATE INDEX "Order_mode_status_idx" ON "Order"("mode", "status");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_exchangeKeyId_fkey" FOREIGN KEY ("exchangeKeyId") REFERENCES "ExchangeKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
