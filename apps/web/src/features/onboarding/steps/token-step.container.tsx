import { TokenStep } from "@/components/wizard-steps";
import { usePresenter } from "@/presenter/presenter-context";
import { useOnboardingViewModel } from "../use-onboarding-view-model";

export function TokenStepContainer() {
  const presenter = usePresenter();
  const { viewModel } = useOnboardingViewModel();

  return (
    <TokenStep
      value={viewModel.token.value}
      onChange={presenter.onboarding.setTokenInput}
      onSubmit={presenter.onboarding.handleTokenSubmit}
      isProcessing={viewModel.token.isProcessing}
      message={viewModel.token.message}
    />
  );
}
