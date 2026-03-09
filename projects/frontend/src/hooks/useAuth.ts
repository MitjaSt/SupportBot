import { useAuth as useOidcAuth } from 'react-oidc-context';

/**
 * Stable auth interface used across the admin app.
 * Wraps react-oidc-context so swapping the OIDC provider is a single-file change.
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: { sub: string; name?: string } | null;
  /** Raw access token to pass to apiFetch() for authenticated API calls. */
  token: string | null;
  signIn: () => void;
  signOut: () => void;
}

export function useAuth(): AuthState {
  const auth = useOidcAuth();
  return {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user
      ? { sub: auth.user.profile.sub, name: auth.user.profile.name ?? undefined }
      : null,
    token: auth.user?.access_token ?? null,
    signIn: () => void auth.signinRedirect(),
    signOut: () => void auth.signoutRedirect(),
  };
}
