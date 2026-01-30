import { useEffect } from "react";

import type { WizardStep } from "@/components/wizard-sidebar";

import type { OnboardingActions } from "./onboarding-types";
import { resolveNextStep, stepIndex } from "./onboarding-steps";

export function useStatusPolling(refresh: () => Promise<void>, jobsRunning: boolean) {
  useEffect(() => {
    refresh();
    if (jobsRunning) return;
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh, jobsRunning]);
}

export function useAuthCheck(checkAuth: () => Promise<void>) {
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
}

type AutoStartParams = {
  autoStarted: boolean;
  hasStatus: boolean;
  cliInstalled: boolean;
  authRequired: boolean;
  authHeader: string | null;
  quickstartRunning: boolean;
  gatewayOk: boolean;
  startQuickstartJob: (opts: { runProbe?: boolean; startGateway?: boolean }) => Promise<{
    ok: boolean;
    error?: string;
    result?: { gatewayReady?: boolean; probeOk?: boolean } | null;
  }>;
  setMessage: (value: string | null) => void;
  setAutoStarted: (value: boolean) => void;
};

export function useAutoStartGateway(params: AutoStartParams) {
  const {
    autoStarted,
    hasStatus,
    cliInstalled,
    authRequired,
    authHeader,
    quickstartRunning,
    gatewayOk,
    startQuickstartJob,
    setMessage,
    setAutoStarted
  } = params;

  useEffect(() => {
    if (
      autoStarted ||
      !hasStatus ||
      !cliInstalled ||
      (authRequired && !authHeader) ||
      quickstartRunning
    ) {
      return;
    }
    if (gatewayOk) {
      setAutoStarted(true);
      return;
    }
    const run = async () => {
      setMessage("正在自动启动网关...");
      const result = await startQuickstartJob({ startGateway: true, runProbe: false });
      if (!result.ok) {
        setMessage(`启动失败: ${result.error}`);
      } else if (result.result?.gatewayReady) {
        setMessage("网关已就绪。");
      } else {
        setMessage("网关正在启动中...");
      }
      setAutoStarted(true);
    };
    void run();
  }, [
    autoStarted,
    hasStatus,
    cliInstalled,
    authRequired,
    authHeader,
    quickstartRunning,
    gatewayOk,
    setMessage,
    setAutoStarted,
    startQuickstartJob
  ]);
}

type AutoAdvanceParams = {
  hasStatus: boolean;
  authRequired: boolean;
  authHeader: string | null;
  cliInstalled: boolean;
  gatewayOk: boolean;
  tokenConfigured: boolean;
  aiConfigured: boolean;
  allowFromConfigured: boolean;
  probeOk: boolean;
  setCurrentStep: (value: WizardStep | ((prev: WizardStep) => WizardStep)) => void;
};

export function useAutoAdvanceStep(params: AutoAdvanceParams) {
  const {
    hasStatus,
    authRequired,
    authHeader,
    cliInstalled,
    gatewayOk,
    tokenConfigured,
    aiConfigured,
    allowFromConfigured,
    probeOk,
    setCurrentStep
  } = params;

  useEffect(() => {
    if (!hasStatus) return;
    const target = resolveNextStep({
      authRequired,
      authHeader,
      cliInstalled,
      gatewayOk,
      tokenConfigured,
      aiConfigured,
      allowFromConfigured,
      probeOk
    });
    setCurrentStep((prev) => {
      if (prev === target) return prev;
      return stepIndex(target) > stepIndex(prev) ? target : prev;
    });
  }, [
    hasStatus,
    authRequired,
    authHeader,
    cliInstalled,
    gatewayOk,
    tokenConfigured,
    aiConfigured,
    allowFromConfigured,
    probeOk,
    setCurrentStep
  ]);
}

type EnterSubmitParams = {
  currentStep: WizardStep;
  authRequired: boolean;
  authHeader: string | null;
  cliInstalled: boolean;
  tokenInput: string;
  aiKeyInput: string;
  pairingInput: string;
  isProcessing: boolean;
  actions: OnboardingActions;
};

export function useEnterKeySubmit(params: EnterSubmitParams) {
  const {
    currentStep,
    authRequired,
    authHeader,
    cliInstalled,
    tokenInput,
    aiKeyInput,
    pairingInput,
    isProcessing,
    actions
  } = params;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !isProcessing) {
        if (currentStep === "auth" && authRequired && !authHeader) {
          actions.handleAuthSubmit();
        } else if (currentStep === "cli" && !cliInstalled) {
          actions.handleCliInstall();
        } else if (currentStep === "token" && tokenInput.trim()) {
          actions.handleTokenSubmit();
        } else if (currentStep === "ai" && aiKeyInput.trim()) {
          actions.handleAiSubmit();
        } else if (currentStep === "pairing" && pairingInput.trim()) {
          actions.handlePairingSubmit();
        } else if (currentStep === "probe") {
          actions.handleProbe();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentStep,
    authRequired,
    authHeader,
    cliInstalled,
    tokenInput,
    aiKeyInput,
    pairingInput,
    isProcessing,
    actions
  ]);
}
