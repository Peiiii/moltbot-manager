import { AuthStep } from "@/components/wizard-steps";
import { usePresenter } from "@/presenter/presenter-context";
import { useOnboardingViewModel } from "../use-onboarding-view-model";

export function AuthStepContainer() {
  const presenter = usePresenter();
  const { viewModel } = useOnboardingViewModel();

  return (
    <AuthStep
      username={viewModel.auth.username}
      password={viewModel.auth.password}
      onUsernameChange={presenter.onboarding.setAuthUser}
      onPasswordChange={presenter.onboarding.setAuthPass}
      onSubmit={presenter.onboarding.handleAuthSubmit}
      isProcessing={viewModel.auth.isProcessing}
      message={viewModel.auth.message}
      configured={viewModel.auth.configured}
    />
  );
}
