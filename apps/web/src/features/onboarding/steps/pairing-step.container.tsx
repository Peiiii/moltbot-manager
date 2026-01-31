import { PairingStep } from "@/components/wizard-steps";
import { usePresenter } from "@/presenter/presenter-context";
import { useOnboardingViewModel } from "../use-onboarding-view-model";

export function PairingStepContainer() {
  const presenter = usePresenter();
  const { viewModel } = useOnboardingViewModel();

  return (
    <PairingStep
      value={viewModel.pairing.value}
      onChange={presenter.onboarding.setPairingInput}
      onSubmit={presenter.onboarding.handlePairingSubmit}
      isProcessing={viewModel.pairing.isProcessing}
      message={viewModel.pairing.message}
      pendingPairings={viewModel.pairing.pendingPairings}
      logs={viewModel.pairing.logs}
      jobStatus={viewModel.pairing.jobStatus}
      jobError={viewModel.pairing.jobError}
    />
  );
}
