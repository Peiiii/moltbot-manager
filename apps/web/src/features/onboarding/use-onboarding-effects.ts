import { useEffect } from "react";

import type { WizardStep } from "@/components/wizard-sidebar";

import type { OnboardingActions } from "./onboarding-types";
import type { OnboardingContext } from "./onboarding-machine";

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

type OnboardingFlowParams = {
  hasStatus: boolean;
  context: OnboardingContext;
  onStatusUpdate: (context: OnboardingContext) => void;
};

export function useOnboardingFlow(params: OnboardingFlowParams) {
  const { hasStatus, context, onStatusUpdate } = params;

  useEffect(() => {
    if (!hasStatus) return;
    onStatusUpdate(context);
  }, [
    hasStatus,
    context.authRequired,
    context.authHeader,
    context.cliInstalled,
    context.gatewayOk,
    context.tokenConfigured,
    context.aiConfigured,
    context.allowFromConfigured,
    context.probeOk,
    onStatusUpdate
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
