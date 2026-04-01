-- AlterTable
ALTER TABLE "Strategy" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- BackfillData: assign initial order values based on createdAt per user
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "Strategy"
)
UPDATE "Strategy"
SET "order" = ranked.rn
FROM ranked
WHERE "Strategy".id = ranked.id;
