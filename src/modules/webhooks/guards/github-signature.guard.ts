import {
  CanActivate,
  ExecutionContext,
  Injectable,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

// Verifies GitHub's x-hub-signature-256 (HMAC-SHA256 of the raw request bytes).
// Runs before any parsing. Never logs the secret or the signature.
@Injectable()
export class GithubSignatureGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const provided = req.headers['x-hub-signature-256'];
    const raw = req.rawBody;

    if (!raw || typeof provided !== 'string') {
      throw new UnauthorizedException('missing signature');
    }

    const secret = this.config.getOrThrow<string>('GITHUB_WEBHOOK_SECRET');
    const expected =
      'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('invalid signature');
    }
    return true;
  }
}
