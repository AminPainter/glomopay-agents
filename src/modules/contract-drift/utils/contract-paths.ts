import { ConfigService } from '@nestjs/config';
import { globToRegExp } from '../../../shared/utils/glob';

export const DEFAULT_CONTRACT_PATHS = [
  'app/models/**',
  'app/serializers/**',
  'app/controllers/**',
  'app/views/**/*.json.jbuilder',
  'db/schema.rb',
  'db/migrate/**',
];

// Rails paths whose change can alter an API response contract. RAILS_CONTRACT_PATHS
// (comma/newline separated globs) overrides the default allowlist.
export function contractPathMatchers(config: ConfigService): RegExp[] {
  const override = config.get<string>('RAILS_CONTRACT_PATHS');
  const globs = override
    ? override
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_CONTRACT_PATHS;
  return globs.map(globToRegExp);
}
