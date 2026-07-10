import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { GITHUB_CLIENT } from '../github.tokens';

// The single seam for the future GitHub App migration: swap PAT auth for
// createAppAuth (installation token + bot identity) here and nothing else changes.
export const githubClientProvider: Provider = {
  provide: GITHUB_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new Octokit({ auth: config.getOrThrow<string>('GITHUB_TOKEN') }),
};
