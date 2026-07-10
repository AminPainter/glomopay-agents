import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { matchesAny } from '../../../shared/utils/glob';
import { PushEvent } from '../../github/dtos/push-event.schema';
import {
  DRIFT_QUEUE,
  DriftJobData,
} from '../../contract-drift/interfaces/drift-job.interface';
import { contractPathMatchers } from '../../contract-drift/utils/contract-paths';

export type GateResult =
  { status: 'ignored'; reason: string } | { status: 'enqueued'; jobId: string };

@Injectable()
export class DriftGateService {
  private readonly logger = new Logger(DriftGateService.name);
  private readonly patterns: RegExp[];
  private readonly backendRepo: string;
  private readonly branchRef: string;

  constructor(
    private readonly config: ConfigService,
    @InjectQueue(DRIFT_QUEUE) private readonly queue: Queue<DriftJobData>,
  ) {
    this.patterns = contractPathMatchers(this.config);
    this.backendRepo = this.config.getOrThrow<string>('GITHUB_BACKEND_REPO');
    this.branchRef = `refs/heads/${this.config.getOrThrow<string>('GITHUB_DEFAULT_BRANCH')}`;
  }

  async evaluate(push: PushEvent, deliveryId: string): Promise<GateResult> {
    if (push.repository.full_name !== this.backendRepo) {
      return this.ignore(deliveryId, 'unexpected-repo');
    }
    if (push.ref !== this.branchRef) {
      return this.ignore(deliveryId, 'non-default-ref');
    }
    if (push.deleted) {
      return this.ignore(deliveryId, 'branch-deleted');
    }

    const changedFiles = this.collectChangedFiles(push);
    const relevant = changedFiles.filter((f) => matchesAny(f, this.patterns));
    if (relevant.length === 0) {
      return this.ignore(deliveryId, 'no-relevant-paths');
    }

    await this.queue.add(
      'drift',
      {
        deliveryId,
        repo: push.repository.full_name,
        ref: push.ref,
        before: push.before,
        after: push.after,
        changedFiles: relevant,
      },
      { jobId: deliveryId },
    );
    this.logger.log(
      `enqueued drift job delivery=${deliveryId} after=${push.after.slice(0, 12)} relevant=${relevant.length}`,
    );
    return { status: 'enqueued', jobId: deliveryId };
  }

  private collectChangedFiles(push: PushEvent): string[] {
    const set = new Set<string>();
    for (const c of push.commits) {
      for (const f of [...c.added, ...c.modified, ...c.removed]) set.add(f);
    }
    return [...set];
  }

  private ignore(deliveryId: string, reason: string): GateResult {
    this.logger.debug(`ignored delivery=${deliveryId} reason=${reason}`);
    return { status: 'ignored', reason };
  }
}
