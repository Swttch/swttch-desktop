import type { ProfileResponse, UsageResponse } from '@swttch/extend-kit/battery';

export interface ProviderUsage {
  profile: ProfileResponse | null;
  usage: UsageResponse | null;
  checkedAt: number;
  usageStale?: boolean;
  attemptedAt?: number;
  errors: { profile: { code: string; message: string; retryAfterSec?: number } | null; usage: { code: string; message: string; retryAfterSec?: number } | null };
}
