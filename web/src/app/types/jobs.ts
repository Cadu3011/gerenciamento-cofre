export interface Job {
  id: number;
  jobName: string;
  status: boolean;
  updatedAt: Date;
  createdAt: Date;
  cronJobs: CronJob[];
}

export interface CronJob {
  id: number;
  jobName: string;
  message: string;
  idJobs: number;
  createdAt: Date;
  finishedAt: Date;
  status: string;
  runDate: string;
}
