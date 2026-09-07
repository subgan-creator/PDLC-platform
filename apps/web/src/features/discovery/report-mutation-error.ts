import type { useToast } from '@pdlc/ui';
import { isApiError } from '../../lib/api-client';

/**
 * Every form/dialog across Discovery Hub calls
 * `.catch(reportMutationError(push, '...'))` on its mutation — found via a
 * real user report ("I click Add and the modal just sits there") that none
 * of them had any error handling at all: if a mutation ever rejects (a
 * network hiccup, the dev server restarting, a validation error), the
 * .then() chain that closes the dialog / clears the form silently never
 * runs, leaving the user looking at an unresponsive dialog with zero
 * explanation. This doesn't fix why a mutation might fail — it makes sure
 * a failure is never silent.
 */
export function reportMutationError(push: ReturnType<typeof useToast>['push'], title: string) {
  return (err: unknown) => {
    push({
      title,
      description: isApiError(err) ? err.problem.detail : 'Please try again.',
      variant: 'danger',
    });
  };
}
