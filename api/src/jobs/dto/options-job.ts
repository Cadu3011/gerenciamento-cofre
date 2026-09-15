import { JobExecutionContext } from '../jobs.execContext.service';
import { RunJobQueryDto } from './runCronJob.dto';

export type JobPeriod =
  | {
      type: 'AUTO';
    }
  | {
      type: 'DATE';
      date: string;
    }
  | {
      type: 'RANGE';
      startDate: string;
      endDate: string;
    };

// export class JobOptions {
//   force?: boolean;
//   bigCharge?: boolean;
//   logLevel?: 'ALL' | 'WARN_ERROR' | 'ERROR_ONLY' | 'NONE';
//   wait?: boolean;

//   period?: JobPeriod;
// }

export interface InfoJob {
  jobId: number;
  jobName: string;
  context: JobExecutionContext;
  options: RunJobQueryDto;

  execute: (
    context: JobExecutionContext,
    options: RunJobQueryDto,
  ) => Promise<void>;
}
