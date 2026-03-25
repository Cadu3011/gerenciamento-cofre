/*
  Warnings:

  - Made the column `obsConf` on table `diferencacaixa` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `diferencacaixa` MODIFY `obsConf` VARCHAR(255) NOT NULL;
