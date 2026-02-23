/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `TrierCartaoVendas` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `TrierCartaoVendas_idempotencyKey_key` ON `TrierCartaoVendas`(`idempotencyKey`);
