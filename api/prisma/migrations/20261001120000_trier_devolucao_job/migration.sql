-- Insere a tarefa de reprocessamento das devoluções de parcelas do Trier.
--
-- Sem `@Cron` em jobs.service.ts: o disparo é manual. A tarefa precisa existir
-- em `Jobs` porque `runCronJob` aborta com "inativa" quando não encontra a
-- linha. `INSERT IGNORE` mantém a migration idempotente em bancos onde a
-- tarefa já foi cadastrada pela tela de tarefas.
INSERT IGNORE INTO `Jobs` (`jobName`, `status`, `createdAt`, `updatedAt`)
VALUES ('TrierDevolucao', true, NOW(3), NOW(3));