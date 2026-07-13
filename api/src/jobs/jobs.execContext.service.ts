export interface JobLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  step: string;
  message: string;
  durationMs?: number;
}

export interface ProgressInfo {
  startDate: string;
  endDate: string;
  currentDate: string;
  totalDays: number;
  completedDays: number;
  percentage: number;
  hasRetry?: boolean;
  retries?: number;

  hasError?: boolean;
  errorMessage?: string;
}

export interface JobExecutionContextOptions {
  /**
   * Define quais logs serão armazenados.
   */
  logLevel?: 'ALL' | 'WARN_ERROR' | 'ERROR_ONLY' | 'NONE';

  /**
   * Quantidade máxima de logs mantidos em memória.
   */
  maxLogs?: number;

  /**
   * Intervalo mínimo entre atualizações da interface.
   */
  updateIntervalMs?: number;

  /**
   * Tamanho máximo da mensagem de log.
   */
  maxMessageLength?: number;
}

export class JobExecutionContext {
  constructor(
    private readonly onUpdate?: (ctx: JobExecutionContext) => Promise<void>,
    private readonly options: JobExecutionContextOptions = {},
  ) {}
  private root: JobExecutionContext = this;
  private readonly startedAtDate = new Date();
  readonly startedAt = this.startedAtDate.toISOString();

  logs: JobLog[] = [];
  progress: Record<string, ProgressInfo> = {};
  metrics = {
    files: 0,
    extracted: 0,
    inserted: 0,
    warnings: 0,
    errors: 0,
    retries: 0,
  };
  createChild(options?: Partial<JobExecutionContextOptions>) {
    const child = new JobExecutionContext(this.onUpdate, {
      ...this.options,
      ...options,
    });

    child.metrics = this.metrics;
    child.progress = this.progress;
    child.notifyState = this.notifyState;
    child.root = this.root;

    return child;
  }
  private readonly stepStartTimes = new Map<string, number>();
  private mergeQueue = Promise.resolve();
  private notifyState = {
    lastUpdate: 0,
  };

  private get maxLogs() {
    return this.options.maxLogs ?? 5000;
  }

  private get updateInterval() {
    return this.options.updateIntervalMs ?? 1000;
  }

  private get maxMessageLength() {
    return this.options.maxMessageLength ?? 500;
  }

  private shouldStoreLog(level: JobLog['level']) {
    switch (this.options.logLevel ?? 'ALL') {
      case 'ALL':
        return true;

      case 'WARN_ERROR':
        return level !== 'INFO';

      case 'ERROR_ONLY':
        return level === 'ERROR';

      case 'NONE':
        return false;

      default:
        return true;
    }
  }

  private async notify(force = false) {
    if (!this.onUpdate) {
      return;
    }

    const now = Date.now();

    if (!force && now - this.notifyState.lastUpdate < this.updateInterval) {
      return;
    }

    this.notifyState.lastUpdate = now;

    await this.onUpdate(this.root);
  }

  /**
   * Marca o início de uma etapa.
   */
  startStep(step: string) {
    this.stepStartTimes.set(step, Date.now());
  }

  private diffDays(from: string, to: string) {
    const a = new Date(from + 'T00:00:00').getTime();
    const b = new Date(to + 'T00:00:00').getTime();

    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
  }

  async startDateProgress(key: string, startDate: string, endDate: string) {
    if (!this.progress[key]) {
      this.progress[key] = {
        startDate,
        endDate,
        currentDate: startDate,
        totalDays: this.diffDays(startDate, endDate) + 1,
        completedDays: 0,
        percentage: 0,
      };

      await this.notify();
    }
  }

  async updateDateProgress(key: string, currentDate: string) {
    const progress = this.progress[key];

    if (!progress) {
      return;
    }

    progress.currentDate = currentDate;

    progress.completedDays = this.diffDays(progress.startDate, currentDate) + 1;

    if (progress.completedDays > progress.totalDays) {
      progress.completedDays = progress.totalDays;
    }

    progress.percentage = Math.round(
      (progress.completedDays / progress.totalDays) * 100,
    );

    await this.notify();
  }

  async finishProgress(key: string) {
    delete this.progress[key];
    await this.notify();
  }

  async markProgressError(key: string, message?: string) {
    const progress = this.progress[key];

    if (!progress) return;

    progress.hasError = true;
    progress.errorMessage = message;

    await this.notify();
  }
  async incrementProgressRetry(key: string) {
    const progress = this.progress[key];

    if (!progress) return;

    progress.hasRetry = true;
    progress.retries = (progress.retries ?? 0) + 1;

    await this.notify();
  }

  /**
   * Finaliza uma etapa.
   */
  async endStep(step: string, message: string) {
    const startedAt = this.stepStartTimes.get(step);

    if (startedAt === undefined) {
      throw new Error(`A etapa "${step}" não foi iniciada.`);
    }

    try {
      await this.addLog('INFO', step, message, Date.now() - startedAt);
    } finally {
      this.stepStartTimes.delete(step);
    }
  }

  async merge(other: JobExecutionContext) {
    this.mergeQueue = this.mergeQueue
      .catch(() => undefined)
      .then(async () => {
        this.logs.push(...other.logs);

        if (this.logs.length > this.maxLogs) {
          this.logs.splice(0, this.logs.length - this.maxLogs);
        }

        await this.flush();
      });

    return this.mergeQueue;
  }
  /**
   * Adiciona um log.
   */
  private async addLog(
    level: JobLog['level'],
    step: string,
    message: string,
    durationMs?: number,
  ) {
    if (level === 'WARN') {
      this.metrics.warnings++;
    }

    if (level === 'ERROR') {
      this.metrics.errors++;
    }

    if (message.length > this.maxMessageLength) {
      message = message.slice(0, this.maxMessageLength) + '...';
    }

    if (this.shouldStoreLog(level)) {
      if (this.logs.length >= this.maxLogs) {
        this.logs.shift();
      }

      this.logs.push({
        timestamp: new Date().toISOString(),
        level,
        step,
        message,
        durationMs,
      });
    }

    await this.notify();
  }

  async info(step: string, message: string) {
    await this.addLog('INFO', step, message);
  }

  async warn(step: string, message: string) {
    await this.addLog('WARN', step, message);
  }

  async error(step: string, message: string) {
    await this.addLog('ERROR', step, message);
  }

  async incrementRetries(count = 1) {
    this.metrics.retries += count;
    await this.notify();
  }

  async incrementInserted(count = 1) {
    this.metrics.inserted += count;
    await this.notify();
  }

  async incrementExtracted(count = 1) {
    this.metrics.extracted += count;
    await this.notify();
  }

  async incrementFiles(count = 1) {
    this.metrics.files += count;
    await this.notify();
  }

  /**
   * Força uma atualização da interface.
   */
  async flush() {
    await this.notify(true);
  }

  /**
   * Retorna o resumo da execução.
   */
  finish() {
    const finishedAt = new Date();

    return {
      startedAt: this.startedAt,
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - this.startedAtDate.getTime(),
      metrics: this.metrics,
      logs: this.logs,
      progress: this.progress,
    };
  }
}
