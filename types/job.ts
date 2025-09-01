export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobStep {
  name: string;
  status: StepStatus;
}

export interface Job {
  id: string;
  filename: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  inputFileUrl: string | null;
  outputFileUrl: string | null;
  steps: JobStep[];
}
