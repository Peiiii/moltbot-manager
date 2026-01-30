import type { StatusResponse } from "@/store/status-store";

import type { OnboardingDerived } from "./onboarding-types";

export function deriveOnboardingStatus(
  status: StatusResponse | null,
  loading: boolean
): OnboardingDerived {
  return {
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
