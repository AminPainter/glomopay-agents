import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DRIFT_QUEUE, DriftJobData } from '../interfaces/drift-job.interface';
import { DriftProcessorService } from '../services/drift-processor.service';

@Processor(DRIFT_QUEUE, {
  concurrency: Number(process.env.DRIFT_QUEUE_CONCURRENCY) || 1,
})
export class DriftProcessor extends WorkerHost {
  private readonly logger = new Logger(DriftProcessor.name);

  constructor(private readonly processor: DriftProcessorService) {
    super();
  }

  async process(job: Job<DriftJobData>): Promise<unknown> {
    this.logger.log(`processing job ${job.id}`);
    return this.processor.process(job.data);
  }
}
