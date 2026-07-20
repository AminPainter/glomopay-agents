import { Injectable } from '@nestjs/common';
import { GmailClient } from '../clients/gmail.client';
import { SupportAgentService } from '../../support-agent/services/support-agent.service';

@Injectable()
export class GmailIngestionService {
  constructor(
    private readonly client: GmailClient,
    private readonly supportAgentService: SupportAgentService,
  ) {}

  async ingest(): Promise<void> {
    const { ids } = await this.client.listMessageIds();
    const [id] = ids;
    if (!id) return;

    const message = await this.client.getRawMessage(id);
    if (!message.raw) return;

    const email = Buffer.from(message.raw, 'base64url').toString('utf8');
    await this.supportAgentService.draftReply(email);
  }
}
