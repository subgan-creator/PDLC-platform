/**
 * Minimal feature-flag contract used across services. Phase 0 ships an
 * env/tenant-config-backed implementation; a real flag provider (e.g.
 * LaunchDarkly, Unleash) can implement the same interface later without
 * callers changing.
 *
 * Non-negotiable per CLAUDE.md: every AI feature flag defaults to `false`
 * and is evaluated per-tenant, never globally-on.
 */
export interface FeatureFlagKey {
  readonly key: string;
}

export const FEATURE_FLAGS = {
  aiStoryDrafting: { key: 'ai.story-drafting' },
  aiSummarization: { key: 'ai.summarization' },
  aiResumeCards: { key: 'ai.resume-cards' },
} as const satisfies Record<string, FeatureFlagKey>;

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;

export interface FeatureFlagProvider {
  isEnabled(flag: FeatureFlagKey, tenantId: string): Promise<boolean>;
}

/** Default-deny provider: used until a real backing store is wired up. */
export class StaticDenyFeatureFlagProvider implements FeatureFlagProvider {
  isEnabled(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
