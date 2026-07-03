export interface JobLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  step: string;
  message: string;
}

export class JobExecutionContext {
  readonly startedAt = new Date().toISOString();

  logs: JobLog[] = [];

  metrics = {
    files: 0,

    extracted: 0,

    transformed: 0,

    inserted: 0,

    duplicated: 0,

    ignored: 0,
  };

  info(step: string, message: string) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      step,
      message,
    });
  }

  warn(step: string, message: string) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      step,
      message,
    });
  }

  error(step: string, message: string) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      step,
      message,
    });
  }

  incrementInserted(count = 1) {
    this.metrics.inserted += count;
  }

  incrementExtracted(count = 1) {
    this.metrics.extracted += count;
  }

  incrementFiles() {
    this.metrics.files++;
  }

  finish() {
    return {
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      metrics: this.metrics,
      logs: this.logs,
    };
  }
}
