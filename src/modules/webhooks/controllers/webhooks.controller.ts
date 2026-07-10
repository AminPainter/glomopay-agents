import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { GithubSignatureGuard } from '../guards/github-signature.guard';
import { DriftGateService, GateResult } from '../services/drift-gate.service';
import { pushEventSchema } from '../../github/dtos/push-event.schema';

const pushPipe = new ZodValidationPipe(pushEventSchema);

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly gate: DriftGateService) {}

  @Post('github')
  @HttpCode(202)
  @UseGuards(GithubSignatureGuard)
  async github(
    @Headers('x-github-event') event: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Body() body: unknown,
  ): Promise<GateResult | { status: string }> {
    if (event === 'ping') return { status: 'pong' };
    if (event !== 'push') return { status: 'ignored-event' };

    const push = pushPipe.transform(body);
    return this.gate.evaluate(push, deliveryId);
  }
}
