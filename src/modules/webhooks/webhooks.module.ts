import { Module } from '@nestjs/common';
import { ContractDriftModule } from '../contract-drift/contract-drift.module';
import { WebhooksController } from './controllers/webhooks.controller';
import { DriftGateService } from './services/drift-gate.service';

@Module({
  imports: [ContractDriftModule],
  controllers: [WebhooksController],
  providers: [DriftGateService],
})
export class WebhooksModule {}
