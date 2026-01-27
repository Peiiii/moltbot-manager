import { resolveAuthState } from "../lib/auth.js";

type AuthStatus = {
  required: boolean;
  configured: boolean;
};

type LoginResult =
  | {
      ok: true;
      disabled?: boolean;
    }
  | {
      ok: false;
      error: string;
      status: 400 | 401;
    };

export function getAuthStatus(authDisabled: boolean): AuthStatus {
  const authState = resolveAuthState(authDisabled);
  return {
    required: !authDisabled,
    configured: authState.configured
  };
}

export function loginWithCredentials(
  authDisabled: boolean,
  username: string,
  password: string
): LoginResult {
  if (authDisabled) {
    return { ok: true, disabled: true };
  }

  const authState = resolveAuthState(authDisabled);
  if (!authState.configured) {
    return { ok: false, error: "auth not configured", status: 400 };
  }
  if (!username || !password) {
    return { ok: false, error: "missing credentials", status: 400 };
  }
  if (!authState.verify(username, password)) {
    return { ok: false, error: "invalid credentials", status: 401 };
  }
  return { ok: true };
}
