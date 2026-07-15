import { Injectable, Logger } from '@nestjs/common';
import { GmailClientService } from '../clients/gmail.client';

@Injectable()
export class GmailIngestionService {
  private readonly logger = new Logger(GmailIngestionService.name);

  constructor(private readonly client: GmailClientService) {}

  async ingest(): Promise<void> {
    const { ids } = await this.client.listMessageIds();
    for (const id of ids) {
      const message = await this.client.getRawMessage(id);
      if (!message.raw) {
        continue;
      }
      const email = Buffer.from(message.raw, 'base64url').toString('utf8');
      this.logger.log(`incoming email ${message.id ?? id}:\n${email}`);
    }
  }
}
