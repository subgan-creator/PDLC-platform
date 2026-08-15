import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@pdlc/ui';
import { useAuth } from './auth-context';
import { listDevIdentities, type DevIdentityOption } from './dev-identities-api';

/**
 * Dev-stub mode has no real login flow, but "open devtools and paste JSON
 * into localStorage" isn't a reasonable ask of anyone running this
 * locally. This blocks the app behind a plain "choose who you are" screen
 * until a devIdentity is set, fetching the real seeded users from
 * `/dev/identities` (see apps/api's DevToolsController — only responds in
 * AUTH_MODE=dev-stub, so this whole gate is a no-op shape once real OIDC
 * auth replaces it).
 */
export function DevIdentityGate({ children }: { children: ReactNode }) {
  const { devIdentity } = useAuth();

  if (!devIdentity) {
    return <IdentityPicker />;
  }
  return <>{children}</>;
}

function IdentityPicker() {
  const { setDevIdentity } = useAuth();
  const [identities, setIdentities] = useState<DevIdentityOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDevIdentities()
      .then(setIdentities)
      .catch(() => {
        setError(
          'Could not reach the API. Make sure it is running (see the Quickstart) and that the database has been seeded.',
        );
      });
  }, []);

  const byTenant = new Map<string, DevIdentityOption[]>();
  for (const identity of identities ?? []) {
    const list = byTenant.get(identity.tenantName) ?? [];
    list.push(identity);
    byTenant.set(identity.tenantName, list);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-lg">
        <h1 className="mb-1 text-xl font-semibold text-fg">Who are you?</h1>
        <p className="mb-6 text-sm text-muted">
          Local dev only — pick a seeded user to act as. Real sign-in (OIDC) replaces this screen
          entirely.
        </p>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-danger bg-danger/10 p-3 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {!identities && !error && <p className="text-sm text-muted">Loading seeded users…</p>}

        {identities && identities.length === 0 && !error && (
          <p className="text-sm text-muted">
            No users found. Run <code className="rounded bg-muted/10 px-1">pnpm db:seed</code> and
            reload.
          </p>
        )}

        <div className="flex flex-col gap-6">
          {[...byTenant.entries()].map(([tenantName, users]) => (
            <div key={tenantName}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {tenantName}
              </h2>
              <ul className="flex flex-col gap-1">
                {users.map((u) => (
                  <li key={u.userId}>
                    <Button
                      variant="secondary"
                      className="w-full justify-start"
                      onClick={() =>
                        setDevIdentity({
                          userId: u.userId,
                          tenantId: u.tenantId,
                          displayName: u.displayName,
                          tenantName: u.tenantName,
                        })
                      }
                    >
                      <span className="flex flex-col items-start">
                        <span>{u.displayName}</span>
                        <span className="text-xs text-muted">
                          {u.persona.replaceAll('_', ' ').toLowerCase()}
                        </span>
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
