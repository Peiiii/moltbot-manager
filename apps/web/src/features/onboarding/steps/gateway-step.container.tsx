import { GatewayStep } from "@/components/wizard-steps";
import { usePresenter } from "@/presenter/presenter-context";
import { useOnboardingViewModel } from "../use-onboarding-view-model";

export function GatewayStepContainer() {
  const presenter = usePresenter();
  const { viewModel } = useOnboardingViewModel();

  return (
    <GatewayStep
      isReady={viewModel.gateway.isReady}
      autoStarted={viewModel.gateway.autoStarted}
      message={viewModel.gateway.message}
      isProcessing={viewModel.gateway.isProcessing}
      logs={viewModel.gateway.logs}
      jobStatus={viewModel.gateway.jobStatus}
      jobError={viewModel.gateway.jobError}
      onRetry={presenter.onboarding.handleRetry}
    />
  );
}
