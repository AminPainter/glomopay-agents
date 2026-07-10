import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from '../ai/ai.module';
import { GithubModule } from '../github/github.module';
import { DRIFT_QUEUE } from './interfaces/drift-job.interface';
import { DRIFT_AGENT } from './interfaces/drift-agent.port';
import { DriftProcessor } from './processors/drift.processor';
import { DriftProcessorService } from './services/drift-processor.service';
import { DriftDetectorService } from './services/drift-detector.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: DRIFT_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    AiModule,
    GithubModule,
  ],
  providers: [
    DriftProcessor,
    DriftProcessorService,
    DriftDetectorService,
    { provide: DRIFT_AGENT, useExisting: DriftDetectorService },
  ],
  exports: [BullModule],
})
export class ContractDriftModule {}
