-- AlterTable: Add idempotencyKey to ConciliacaoParcelaTrier
ALTER TABLE `ConciliacaoParcelaTrier` ADD COLUMN `idempotencyKey` VARCHAR(191) NOT NULL DEFAULT '';

-- CreateIndex: Unique constraint on idempotencyKey for ConciliacaoParcelaTrier
CREATE UNIQUE INDEX `ConciliacaoParcelaTrier_idempotencyKey_key` ON `ConciliacaoParcelaTrier`(`idempotencyKey`);

-- CreateIndex: Add单独 index on conciliacaoParcelaId before dropping old unique
CREATE INDEX `ConciliacaoParcelaTrier_conciliacaoParcelaId_idx` ON `ConciliacaoParcelaTrier`(`conciliacaoParcelaId`);

-- DropIndex: Remove old composite unique constraint
DROP INDEX `ConciliacaoParcelaTrier_conciliacaoParcelaId_trierParcelaId_key` ON `ConciliacaoParcelaTrier`;

-- AlterTable: Add idempotencyKey to ConciliacaoParcelaItem
ALTER TABLE `ConciliacaoParcelaItem` ADD COLUMN `idempotencyKey` VARCHAR(191) NOT NULL DEFAULT '';

-- CreateIndex: Unique constraint on idempotencyKey for ConciliacaoParcelaItem
CREATE UNIQUE INDEX `ConciliacaoParcelaItem_idempotencyKey_key` ON `ConciliacaoParcelaItem`(`idempotencyKey`);
