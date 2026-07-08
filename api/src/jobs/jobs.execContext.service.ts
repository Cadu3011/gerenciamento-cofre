export interface JobLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  step: string;
  message: string;
  durationMs?: number;
}

export class JobExecutionContext {
  constructor(
    private readonly onUpdate?: (ctx: JobExecutionContext) => Promise<void>,
  ) {}

  private readonly startedAtDate = new Date();
  readonly startedAt = this.startedAtDate.toISOString();

  logs: JobLog[] = [];

  metrics = {
    files: 0,
    extracted: 0,
    inserted: 0,
  };

  private readonly stepStartTimes = new Map<string, number>();

  /**
   * Marca o início de uma etapa
   */
  startStep(step: string) {
    this.stepStartTimes.set(step, Date.now());
  }

  /**
   * Finaliza uma etapa e registra sua duração
   */
  async endStep(step: string, message: string) {
    const startedAt = this.stepStartTimes.get(step);

    if (!startedAt) {
      throw new Error(`A etapa "${step}" não foi iniciada.`);
    }

    try {
      await this.addLog('INFO', step, message, Date.now() - startedAt);
    } finally {
      this.stepStartTimes.delete(step);
    }
  }

  /**
   * Método interno responsável por registrar logs
   */
  private async addLog(
    level: JobLog['level'],
    step: string,
    message: string,
    durationMs?: number,
  ) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level,
      step,
      message,
      durationMs,
    });

    await this.onUpdate?.(this);
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

  async incrementInserted(count = 1) {
    this.metrics.inserted += count;
    await this.onUpdate?.(this);
  }

  async incrementExtracted(count = 1) {
    this.metrics.extracted += count;
    await this.onUpdate?.(this);
  }

  async incrementFiles(count = 1) {
    this.metrics.files += count;
    await this.onUpdate?.(this);
  }

  finish() {
    const finishedAt = new Date();

    return {
      startedAt: this.startedAt,
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - this.startedAtDate.getTime(),
      metrics: this.metrics,
      logs: this.logs,
    };
  }
}
