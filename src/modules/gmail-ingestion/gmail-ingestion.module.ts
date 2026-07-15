import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GmailClientService } from './clients/gmail.client';
import { GmailIngestionService } from './services/gmail-ingestion.service';
import {
  GMAIL_POLL_QUEUE,
  GmailPollProcessor,
} from './processors/gmail-poll.processor';

@Module({
  imports: [BullModule.registerQueue({ name: GMAIL_POLL_QUEUE })],
  providers: [GmailClientService, GmailIngestionService, GmailPollProcessor],
  exports: [GmailIngestionService],
})
export class GmailIngestionModule {}
