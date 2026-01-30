import type { WizardStep } from "@/components/wizard-sidebar";

const stepOrder: WizardStep[] = [
  "auth",
  "cli",
  "gateway",
  "token",
  "ai",
  "pairing",
  "probe",
  "complete"
];

export function stepIndex(step: WizardStep) {
  return stepOrder.indexOf(step);
}

export function resolveNextStep(params: {
  authRequired: boolean;
  authHeader: string | null;
  cliInstalled: boolean;
  gatewayOk: boolean;
  tokenConfigured: boolean;
  aiConfigured: boolean;
  allowFromConfigured: boolean;
  probeOk: boolean;
}): WizardStep {
  const {
    authRequired,
    authHeader,
    cliInstalled,
    gatewayOk,
    tokenConfigured,
    aiConfigured,
    allowFromConfigured,
    probeOk
  } = params;
  if (authRequired && !authHeader) return "auth";
  if (!cliInstalled) return "cli";
  if (probeOk) return "complete";
  if (gatewayOk && tokenConfigured && !aiConfigured) return "ai";
  if (gatewayOk && tokenConfigured && aiConfigured && allowFromConfigured) return "probe";
  if (gatewayOk && tokenConfigured && aiConfigured) return "pairing";
  if (gatewayOk) return "token";
  return "gateway";
}
