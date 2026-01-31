import { CliStep } from "@/components/wizard-steps";
import { usePresenter } from "@/presenter/presenter-context";
import { useOnboardingViewModel } from "../use-onboarding-view-model";

export function CliStepContainer() {
  const presenter = usePresenter();
  const { viewModel } = useOnboardingViewModel();

  return (
    <CliStep
      installed={viewModel.cli.installed}
      version={viewModel.cli.version}
      isChecking={viewModel.cli.isChecking}
      isProcessing={viewModel.cli.isProcessing}
      message={viewModel.cli.message}
      logs={viewModel.cli.logs}
      jobStatus={viewModel.cli.jobStatus}
      jobError={viewModel.cli.jobError}
      onInstall={presenter.onboarding.handleCliInstall}
    />
  );
}
