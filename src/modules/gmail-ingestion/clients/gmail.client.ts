import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, type gmail_v1 } from 'googleapis';

export interface HistoryPage {
  addedMessageIds: string[];
  historyId?: string;
  nextPageToken?: string;
}

export interface MessageIdPage {
  ids: string[];
  nextPageToken?: string;
}

@Injectable()
export class GmailClientService {
  private readonly gmail: gmail_v1.Gmail;
  readonly userId: string;

  constructor(private readonly config: ConfigService) {
    const auth = new google.auth.OAuth2(
      this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
    );
    auth.setCredentials({
      refresh_token: this.config.getOrThrow<string>('GOOGLE_REFRESH_TOKEN'),
    });
    this.gmail = google.gmail({ version: 'v1', auth });
    this.userId = this.config.get<string>('GMAIL_USER_ID', 'me');
  }

  async getProfileHistoryId(): Promise<string | undefined> {
    const { data } = await this.gmail.users.getProfile({ userId: this.userId });
    return data.historyId ?? undefined;
  }

  async listMessageIds(pageToken?: string): Promise<MessageIdPage> {
    const { data } = await this.gmail.users.messages.list({
      userId: this.userId,
      pageToken,
    });
    return {
      ids: (data.messages ?? []).map((m) => m.id!).filter(Boolean),
      nextPageToken: data.nextPageToken ?? undefined,
    };
  }

  async listHistory(
    startHistoryId: string,
    pageToken?: string,
  ): Promise<HistoryPage> {
    const { data } = await this.gmail.users.history.list({
      userId: this.userId,
      startHistoryId,
      historyTypes: ['messageAdded'],
      pageToken,
    });
    const addedMessageIds = (data.history ?? [])
      .flatMap((h) => h.messagesAdded ?? [])
      .map((m) => m.message?.id)
      .filter((id): id is string => Boolean(id));
    return {
      addedMessageIds,
      historyId: data.historyId ?? undefined,
      nextPageToken: data.nextPageToken ?? undefined,
    };
  }

  async getRawMessage(id: string): Promise<gmail_v1.Schema$Message> {
    const { data } = await this.gmail.users.messages.get({
      userId: this.userId,
      id,
      format: 'RAW',
    });
    return data;
  }
}
