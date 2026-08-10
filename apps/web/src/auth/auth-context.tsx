import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { PersonaKey } from '@pdlc/shared-types';
import type { DevIdentity } from '../lib/api-client';

export interface AuthedUser {
  userId: string;
  tenantId: string;
  displayName: string;
  email: string;
  persona: PersonaKey;
}

interface AuthContextValue {
  user: AuthedUser | null;
  devIdentity: DevIdentity | null;
  /** Local-dev only: impersonate a seeded user by id/tenant — see docs/06-adr and CLAUDE.md dev workflow. */
  setDevIdentity: (identity: DevIdentity) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEV_IDENTITY_STORAGE_KEY = 'pdlc.devIdentity';

/**
 * Phase 0 stub: no real OIDC client wired up yet (apps/api's AuthGuard
 * already supports it — see AUTH_MODE=oidc). In dev-stub mode the shell
 * just remembers which seeded user you're acting as, in localStorage, so a
 * reload doesn't lose your session. AuthedUser.displayName/email/persona
 * are populated by whichever page first fetches `/users/me` — this
 * context only owns the identity used to authenticate requests.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [devIdentity, setDevIdentityState] = useState<DevIdentity | null>(() => {
    const raw = localStorage.getItem(DEV_IDENTITY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DevIdentity) : null;
  });
  const [user, setUser] = useState<AuthedUser | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      devIdentity,
      setDevIdentity: (identity) => {
        localStorage.setItem(DEV_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
        setDevIdentityState(identity);
      },
      signOut: () => {
        localStorage.removeItem(DEV_IDENTITY_STORAGE_KEY);
        setDevIdentityState(null);
        setUser(null);
      },
    }),
    [user, devIdentity],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
