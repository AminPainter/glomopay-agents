import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { GmailIngestionService } from '../services/gmail-ingestion.service';

export const GMAIL_POLL_QUEUE = 'gmail-poll';

@Processor(GMAIL_POLL_QUEUE, { concurrency: 1 })
export class GmailPollProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(GmailPollProcessor.name);

  constructor(
    @InjectQueue(GMAIL_POLL_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
    private readonly ingestion: GmailIngestionService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const every = this.config.get<number>('GMAIL_POLL_INTERVAL_MS', 300_000);
    await this.queue.upsertJobScheduler(
      'gmail-poll-scheduler',
      { every },
      { name: 'poll' },
    );
    this.logger.log(`gmail poll scheduled every ${every}ms`);
  }

  async process(): Promise<void> {
    await this.ingestion.ingest();
  }
}
