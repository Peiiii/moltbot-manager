import { useState } from "react";

import type { WizardStep } from "@/components/wizard-sidebar";
import { useConfigStore } from "@/store/config-store";
import { useJobsStore } from "@/store/jobs-store";
import { useStatusStore } from "@/store/status-store";

import { deriveOnboardingStatus } from "./onboarding-derived";
import type {
  OnboardingInputSetters,
  OnboardingMessageSetters,
  OnboardingViewModel
} from "./onboarding-types";
import { useOnboardingActions } from "./use-onboarding-actions";
import {
  useAuthCheck,
  useAutoAdvanceStep,
  useAutoStartGateway,
  useEnterKeySubmit,
  useStatusPolling
} from "./use-onboarding-effects";

export function useOnboarding(): OnboardingViewModel {
  const { status, error, loading, refresh, setDiscordToken } = useStatusStore();
  const { checkAuth, login, authRequired, authConfigured, authHeader } = useConfigStore();
  const {
    cli,
    quickstart,
    pairing,
    resource,
    aiAuth,
    startCliInstallJob,
    startQuickstartJob,
    startPairingJob,
    startResourceDownloadJob,
    startAiAuthJob
  } = useJobsStore();

  const [currentStep, setCurrentStep] = useState<WizardStep>("auth");
  const [tokenInput, setTokenInput] = useState("");
  const [aiProvider, setAiProvider] = useState("anthropic");
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [pairingInput, setPairingInput] = useState("");
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [cliMessage, setCliMessage] = useState<string | null>(null);
  const [probeMessage, setProbeMessage] = useState<string | null>(null);
  const [resourceMessage, setResourceMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);

  const derived = deriveOnboardingStatus(status, loading);
  const jobsRunning =
    cli.status === "running" ||
    quickstart.status === "running" ||
    pairing.status === "running" ||
    resource.status === "running" ||
    aiAuth.status === "running";

  const inputSetters: OnboardingInputSetters = {
    setTokenInput,
    setAiProvider,
    setAiKeyInput,
    setPairingInput,
    setAuthUser,
    setAuthPass
  };

  const messageSetters: OnboardingMessageSetters = {
    setAuthMessage,
    setMessage,
    setAiMessage,
    setCliMessage,
    setProbeMessage,
    setResourceMessage
  };

  const actions = useOnboardingActions({
    inputs: { tokenInput, aiProvider, aiKeyInput, pairingInput, authUser, authPass },
    setInputs: inputSetters,
    setMessages: messageSetters,
    setIsProcessing,
    login,
    refresh,
    setDiscordToken,
    startCliInstallJob,
    startQuickstartJob,
    startPairingJob,
    startResourceDownloadJob,
    startAiAuthJob
  });

  useStatusPolling(refresh, jobsRunning);
  useAuthCheck(checkAuth);
  useAutoStartGateway({
    autoStarted,
    hasStatus: Boolean(status),
    cliInstalled: derived.cliInstalled,
    authRequired,
    authHeader,
    quickstartRunning: quickstart.status === "running",
    gatewayOk: derived.gatewayOk,
    startQuickstartJob,
    setMessage: messageSetters.setMessage,
    setAutoStarted
  });
  useAutoAdvanceStep({
    hasStatus: Boolean(status),
    authRequired,
    authHeader,
    cliInstalled: derived.cliInstalled,
    gatewayOk: derived.gatewayOk,
    tokenConfigured: derived.tokenConfigured,
    aiConfigured: derived.aiConfigured,
    allowFromConfigured: derived.allowFromConfigured,
    probeOk: derived.probeOk,
    setCurrentStep
  });
  useEnterKeySubmit({
    currentStep,
    authRequired,
    authHeader,
    cliInstalled: derived.cliInstalled,
    tokenInput,
    aiKeyInput,
    pairingInput,
    isProcessing,
    actions
  });

  return {
    state: {
      currentStep,
      isConnected: Boolean(status),
      error,
      authRequired,
      authConfigured,
      inputs: {
        tokenInput,
        aiProvider,
        aiKeyInput,
        pairingInput,
        authUser,
        authPass
      },
      messages: {
        authMessage,
        message,
        aiMessage,
        cliMessage,
        probeMessage,
        resourceMessage
      },
      derived,
      jobs: {
        cli,
        quickstart,
        pairing,
        resource,
        aiAuth
      },
      isProcessing,
      autoStarted
    },
    actions: {
      setInputs: inputSetters,
      ...actions
    }
  };
}
