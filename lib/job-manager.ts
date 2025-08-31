class JobManager {
  private savingJobs = new Set<string>();
  private jobStatuses = new Map<string, any>();

  async saveJobStatus(jobId: string, status: any) {
    // Éviter les sauvegardes simultanées pour le même job
    if (this.savingJobs.has(jobId)) {
      console.log(`[${jobId}] Save already in progress, skipping duplicate save...`);
      return this.jobStatuses.get(jobId);
    }

    this.savingJobs.add(jobId);
    
    try {
      console.log(`[${jobId}] Starting job status save operation`);
      const result = await this.performSave(jobId, status);
      this.jobStatuses.set(jobId, status);
      console.log(`[${jobId}] Job status saved successfully`);
      return result;
    } catch (error) {
      console.error(`[${jobId}] Failed to save job status:`, error);
      throw error;
    } finally {
      this.savingJobs.delete(jobId);
    }
  }

  private async performSave(jobId: string, status: any) {
    const { saveWithRetry } = await import('./blob-utils');
    const key = `jobs/${jobId}/manifest.json`;
    return await saveWithRetry(key, status);
  }

  isJobBeingSaved(jobId: string): boolean {
    return this.savingJobs.has(jobId);
  }

  getJobStatus(jobId: string): any {
    return this.jobStatuses.get(jobId);
  }
}

// Singleton instance
export const jobManager = new JobManager();
export { JobManager };