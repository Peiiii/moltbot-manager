import { usePresenter } from "@/presenter/presenter-context";
import { useStatusStore } from "@/stores/status-store";

import {
  useAuthCheck,
  useOnboardingFlow,
  useAutoStartGateway,
  useEnterKeySubmit,
  useStatusPolling
} from "../use-onboarding-effects";
import { useOnboardingViewModel } from "../use-onboarding-view-model";

export function OnboardingOrchestrator() {
  const presenter = usePresenter();
  const status = useStatusStore((state) => state.status);
  const { context, viewModel } = useOnboardingViewModel();

  useStatusPolling(presenter.status.refresh, viewModel.jobsRunning);
  useAuthCheck(presenter.config.checkAuth);
  useAutoStartGateway({
    autoStarted: viewModel.gateway.autoStarted,
    hasStatus: Boolean(status),
    cliInstalled: context.cliInstalled,
    authRequired: context.authRequired,
    authHeader: context.authHeader,
    quickstartRunning: viewModel.gateway.jobStatus === "running",
    gatewayOk: context.gatewayOk,
    startQuickstartJob: presenter.jobs.startQuickstartJob,
    setMessage: presenter.onboarding.setMessage,
    setAutoStarted: presenter.onboarding.setAutoStarted
  });
  useOnboardingFlow({
    hasStatus: Boolean(status),
    context,
    onStatusUpdate: presenter.onboarding.handleStatusUpdate
  });
  useEnterKeySubmit({
    currentStep: viewModel.currentStep,
    authRequired: context.authRequired,
    authHeader: context.authHeader,
    cliInstalled: context.cliInstalled,
    tokenInput: viewModel.token.value,
    aiKeyInput: viewModel.ai.value,
    pairingInput: viewModel.pairing.value,
    isProcessing: viewModel.auth.isProcessing,
    actions: presenter.onboarding
  });

  return null;
}
