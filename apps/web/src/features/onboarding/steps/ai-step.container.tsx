import { AiStep } from "@/components/wizard-steps";
import { usePresenter } from "@/presenter/presenter-context";
import { useOnboardingViewModel } from "../use-onboarding-view-model";

export function AiStepContainer() {
  const presenter = usePresenter();
  const { viewModel } = useOnboardingViewModel();

  return (
    <AiStep
      provider={viewModel.ai.provider}
      value={viewModel.ai.value}
      onProviderChange={presenter.onboarding.setAiProvider}
      onChange={presenter.onboarding.setAiKeyInput}
      onSubmit={presenter.onboarding.handleAiSubmit}
      isProcessing={viewModel.ai.isProcessing}
      message={viewModel.ai.message}
      configured={viewModel.ai.configured}
      missingProviders={viewModel.ai.missingProviders}
      logs={viewModel.ai.logs}
      jobStatus={viewModel.ai.jobStatus}
      jobError={viewModel.ai.jobError}
      statusError={viewModel.ai.statusError}
    />
  );
}
