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
  createdAt: string;
  finishedAt: string;
  status: string;
  runDate: string;
}
