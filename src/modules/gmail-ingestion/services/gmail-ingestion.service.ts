import { Injectable, Logger } from '@nestjs/common';
import { GmailClient } from '../clients/gmail.client';

@Injectable()
export class GmailIngestionService {
  private readonly logger = new Logger(GmailIngestionService.name);

  constructor(private readonly client: GmailClient) {}

  async ingest(): Promise<void> {
    const { ids } = await this.client.listMessageIds();
    const [id] = ids;
    if (!id) return;

    const message = await this.client.getRawMessage(id);
    if (!message.raw) return;

    const email = Buffer.from(message.raw, 'base64url').toString('utf8');
    this.logger.log(`incoming email ${message.id ?? id}:\n${email}`);
  }
}
