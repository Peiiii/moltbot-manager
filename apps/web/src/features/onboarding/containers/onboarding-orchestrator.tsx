import { usePresenter } from "@/presenter/presenter-context";
import { useConfigStore } from "@/stores/config-store";
import { useJobsStore } from "@/stores/jobs-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useStatusStore } from "@/stores/status-store";

import { deriveOnboardingStatus } from "../onboarding-derived";
import {
  useAuthCheck,
  useOnboardingFlow,
  useAutoStartGateway,
  useEnterKeySubmit,
  useStatusPolling
} from "../use-onboarding-effects";

export function OnboardingOrchestrator() {
  const presenter = usePresenter();
  const status = useStatusStore((state) => state.status);
  const loading = useStatusStore((state) => state.loading);
  const authRequired = useConfigStore((state) => state.authRequired);
  const authHeader = useConfigStore((state) => state.authHeader);
  const cliJob = useJobsStore((state) => state.cli);
  const quickstartJob = useJobsStore((state) => state.quickstart);
  const pairingJob = useJobsStore((state) => state.pairing);
  const resourceJob = useJobsStore((state) => state.resource);
  const aiAuthJob = useJobsStore((state) => state.aiAuth);
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const inputs = useOnboardingStore((state) => state.inputs);
  const isProcessing = useOnboardingStore((state) => state.isProcessing);
  const autoStarted = useOnboardingStore((state) => state.autoStarted);

  const derived = deriveOnboardingStatus(status, loading);
  const jobsRunning =
    cliJob.status === "running" ||
    quickstartJob.status === "running" ||
    pairingJob.status === "running" ||
    resourceJob.status === "running" ||
    aiAuthJob.status === "running";

  useStatusPolling(presenter.status.refresh, jobsRunning);
  useAuthCheck(presenter.config.checkAuth);
  useAutoStartGateway({
    autoStarted,
    hasStatus: Boolean(status),
    cliInstalled: derived.cliInstalled,
    authRequired,
    authHeader,
    quickstartRunning: quickstartJob.status === "running",
    gatewayOk: derived.gatewayOk,
    startQuickstartJob: presenter.jobs.startQuickstartJob,
    setMessage: presenter.onboarding.setMessage,
    setAutoStarted: presenter.onboarding.setAutoStarted
  });
  useOnboardingFlow({
    hasStatus: Boolean(status),
    context: {
      authRequired,
      authHeader,
      cliInstalled: derived.cliInstalled,
      gatewayOk: derived.gatewayOk,
      tokenConfigured: derived.tokenConfigured,
      aiConfigured: derived.aiConfigured,
      allowFromConfigured: derived.allowFromConfigured,
      probeOk: derived.probeOk
    },
    onStatusUpdate: presenter.onboarding.handleStatusUpdate
  });
  useEnterKeySubmit({
    currentStep,
    authRequired,
    authHeader,
    cliInstalled: derived.cliInstalled,
    tokenInput: inputs.tokenInput,
    aiKeyInput: inputs.aiKeyInput,
    pairingInput: inputs.pairingInput,
    isProcessing,
    actions: presenter.onboarding
  });

  return null;
}
