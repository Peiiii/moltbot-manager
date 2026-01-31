import { ProbeStep } from "@/components/wizard-steps";
import { usePresenter } from "@/presenter/presenter-context";
import { useOnboardingViewModel } from "../use-onboarding-view-model";

export function ProbeStepContainer() {
  const presenter = usePresenter();
  const { viewModel } = useOnboardingViewModel();

  return (
    <ProbeStep
      isProcessing={viewModel.probe.isProcessing}
      message={viewModel.probe.message}
      logs={viewModel.probe.logs}
      jobStatus={viewModel.probe.jobStatus}
      jobError={viewModel.probe.jobError}
      onRetry={presenter.onboarding.handleProbe}
    />
  );
}
