import type { StatusResponse } from "@/stores/status-store";

export type OnboardingContext = {
  authRequired: boolean;
  authHeader: string | null;
  authConfigured: boolean;
  cliInstalled: boolean;
  cliVersion: string | null;
  cliChecking: boolean;
  gatewayOk: boolean;
  tokenConfigured: boolean;
  aiConfigured: boolean;
  aiMissingProviders: string[];
  aiStatusError: string | null;
  allowFromConfigured: boolean;
  probeOk: boolean;
  pendingPairings: number;
};

export function deriveOnboardingContext(params: {
  status: StatusResponse | null;
  loading: boolean;
  authRequired: boolean;
  authHeader: string | null;
  authConfigured: boolean;
}): OnboardingContext {
  const { status, loading, authRequired, authHeader, authConfigured } = params;
  return {
    authRequired,
    authHeader,
    authConfigured,
    cliInstalled: Boolean(status?.cli.installed),
    cliVersion: status?.cli.version ?? null,
    gatewayOk: Boolean(status?.gateway.ok),
    tokenConfigured: Boolean(status?.onboarding?.discord.tokenConfigured),
    aiConfigured: Boolean(status?.onboarding?.ai?.configured),
    aiMissingProviders: status?.onboarding?.ai?.missingProviders ?? [],
    aiStatusError: status?.onboarding?.ai?.error ?? null,
    allowFromConfigured: Boolean(status?.onboarding?.discord.allowFromConfigured),
    probeOk: status?.onboarding?.probe?.ok === true,
    pendingPairings: status?.onboarding?.discord.pendingPairings ?? 0,
    cliChecking: !status && loading
  };
}
