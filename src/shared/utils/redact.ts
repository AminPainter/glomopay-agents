type RedactionRule = { label: string; re: RegExp };

const RULES: RedactionRule[] = [
  { label: 'clone-url', re: /https?:\/\/x-access-token:[^@\s/'"]+@/gi },
  {
    label: 'db-uri',
    re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/'"@]+:[^\s@'"]+@[^\s'"]+/gi,
  },
  {
    label: 'jwt',
    re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  },
  { label: 'anthropic-key', re: /\bsk-ant-[A-Za-z0-9_-]{10,}/g },
  {
    label: 'github-token',
    re: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{10,}/g,
  },
];

const EMAIL_RE =
  /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
// 13-19 digits, optionally separated by space/hyphen — PAN / long account numbers.
const PAN_RE = /\b(?:\d[ -]?){12,18}\d\b/g;

export function redactSecrets(input: string): string {
  if (!input) return input;
  let out = input;
  for (const { label, re } of RULES) {
    out = out.replace(re, `[REDACTED:${label}]`);
  }
  out = out.replace(
    EMAIL_RE,
    (_m, first: string, domain: string) => `${first}•••@${domain}`,
  );
  out = out.replace(PAN_RE, (m) => {
    const digits = m.replace(/[ -]/g, '');
    return `••••${digits.slice(-4)}`;
  });
  return out;
}

export function redactDeep<T>(value: T): T {
  if (typeof value === 'string') return redactSecrets(value) as unknown as T;
  if (Array.isArray(value))
    return (value as unknown[]).map((v) => redactDeep(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactDeep(v);
    return out as T;
  }
  return value;
}
