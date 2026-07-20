import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, type gmail_v1 } from 'googleapis';
import { TokenStoreService } from '../../auth/services/token-store.service';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

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
export class GmailClient {
  private readonly oauth: OAuth2Client;
  readonly userId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly tokenStore: TokenStoreService,
  ) {
    this.oauth = new google.auth.OAuth2(
      this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
    );
    this.userId = this.config.get<string>('GMAIL_USER_ID', 'me');
  }

  private async client(): Promise<gmail_v1.Gmail> {
    const refreshToken = await this.tokenStore.getRefreshToken();
    if (!refreshToken) {
      throw new Error('no Gmail refresh token — authorize at /auth/google');
    }
    this.oauth.setCredentials({ refresh_token: refreshToken });
    return google.gmail({ version: 'v1', auth: this.oauth });
  }

  async getProfileHistoryId(): Promise<string | undefined> {
    const { data } = await (
      await this.client()
    ).users.getProfile({ userId: this.userId });
    return data.historyId ?? undefined;
  }

  async listMessageIds(pageToken?: string): Promise<MessageIdPage> {
    const { data } = await (
      await this.client()
    ).users.messages.list({
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
    const { data } = await (
      await this.client()
    ).users.history.list({
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
    const { data } = await (
      await this.client()
    ).users.messages.get({
      userId: this.userId,
      id,
      format: 'RAW',
    });
    return data;
  }
}
