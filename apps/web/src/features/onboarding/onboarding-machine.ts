import type { WizardStep } from "@/components/wizard-sidebar";

import { resolveNextStep, stepIndex } from "./onboarding-steps";

export type OnboardingContext = {
  authRequired: boolean;
  authHeader: string | null;
  cliInstalled: boolean;
  gatewayOk: boolean;
  tokenConfigured: boolean;
  aiConfigured: boolean;
  allowFromConfigured: boolean;
  probeOk: boolean;
};

export type OnboardingFlowState = {
  currentStep: WizardStep;
  pendingStep: WizardStep | null;
};

export type OnboardingFlowDecision = {
  targetStep: WizardStep;
  nextStep: WizardStep;
  pendingStep: WizardStep | null;
  clearedPending: WizardStep | null;
  reason: "status-advance" | "no-advance";
};

export function resolveOnboardingFlow(
  state: OnboardingFlowState,
  context: OnboardingContext
): OnboardingFlowDecision {
  const targetStep = resolveNextStep({
    authRequired: context.authRequired,
    authHeader: context.authHeader,
    cliInstalled: context.cliInstalled,
    gatewayOk: context.gatewayOk,
    tokenConfigured: context.tokenConfigured,
    aiConfigured: context.aiConfigured,
    allowFromConfigured: context.allowFromConfigured,
    probeOk: context.probeOk
  });

  const nextStep =
    stepIndex(targetStep) > stepIndex(state.currentStep) ? targetStep : state.currentStep;

  let pendingStep = state.pendingStep;
  let clearedPending: WizardStep | null = null;
  if (pendingStep && isStepSatisfied(context, pendingStep)) {
    clearedPending = pendingStep;
    pendingStep = null;
  }

  return {
    targetStep,
    nextStep,
    pendingStep,
    clearedPending,
    reason: nextStep !== state.currentStep ? "status-advance" : "no-advance"
  };
}

export function isStepSatisfied(context: OnboardingContext, step: WizardStep): boolean {
  switch (step) {
    case "auth":
      return !context.authRequired || Boolean(context.authHeader);
    case "cli":
      return context.cliInstalled;
    case "gateway":
      return context.gatewayOk;
    case "token":
      return context.tokenConfigured;
    case "ai":
      return context.aiConfigured;
    case "pairing":
      return context.allowFromConfigured || context.probeOk;
    case "probe":
    case "complete":
      return context.probeOk;
    default:
      return false;
  }
}
