import { cn } from '@pdlc/ui';
import type { HealthStatus, InitiativePhase } from '@pdlc/shared-types';

const HEALTH_LABEL: Record<HealthStatus, string> = {
  GREEN: 'On track',
  AMBER: 'At risk',
  RED: 'Off track',
};
const HEALTH_CLASS: Record<HealthStatus, string> = {
  GREEN: 'bg-primary/10 text-primary',
  AMBER: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  RED: 'bg-danger/10 text-danger',
};

/** Color + text label together — health is never conveyed by color alone (WCAG 2.2 AA 1.4.1). */
export function HealthBadge({ health }: { health: HealthStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        HEALTH_CLASS[health],
      )}
    >
      {HEALTH_LABEL[health]}
    </span>
  );
}

const PHASE_LABEL: Record<InitiativePhase, string> = {
  DISCOVERY: 'Discovery',
  DEFINITION: 'Definition',
  BUILD: 'Build',
  LAUNCH: 'Launch',
  ADOPT: 'Adopt',
  DONE: 'Done',
};

export function PhaseBadge({ phase }: { phase: InitiativePhase }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-fg">
      {PHASE_LABEL[phase]}
    </span>
  );
}
