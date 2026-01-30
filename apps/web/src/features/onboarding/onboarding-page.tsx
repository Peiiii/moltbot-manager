import { Card } from "@/components/ui/card";
import { WizardSidebar, MobileProgress } from "@/components/wizard-sidebar";
import {
  AuthStep,
  CliStep,
  GatewayStep,
  TokenStep,
  AiStep,
  PairingStep,
  ProbeStep,
  CompleteStep
} from "@/components/wizard-steps";
import type { OnboardingViewModel } from "./onboarding-types";

type OnboardingPageProps = {
  model: OnboardingViewModel;
};

export function OnboardingPage({ model }: OnboardingPageProps) {
  const { state, actions } = model;
  const {
    currentStep,
    isConnected,
    error,
    authConfigured,
    inputs,
    messages,
    derived,
    jobs,
    isProcessing,
    autoStarted
  } = state;
  const { setInputs } = actions;

  return (
    <div className="min-h-screen bg-bg text-ink flex">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-hero-pattern opacity-90" />
        <div className="absolute left-[-20%] top-[-10%] h-96 w-96 rounded-full bg-accent/15 blur-[150px]" />
        <div className="absolute right-[-10%] bottom-[-10%] h-80 w-80 rounded-full bg-accent-2/20 blur-[140px]" />
      </div>

      <WizardSidebar currentStep={currentStep} isConnected={isConnected} error={error} />

      <main className="relative flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-lg">
          <MobileProgress currentStep={currentStep} />

          <Card className="animate-fade-up overflow-hidden">
            {currentStep === "auth" && (
              <AuthStep
                username={inputs.authUser}
                password={inputs.authPass}
                onUsernameChange={setInputs.setAuthUser}
                onPasswordChange={setInputs.setAuthPass}
                onSubmit={actions.handleAuthSubmit}
                isProcessing={isProcessing}
                message={messages.authMessage}
                configured={authConfigured}
              />
            )}

            {currentStep === "cli" && (
              <CliStep
                installed={derived.cliInstalled}
                version={derived.cliVersion}
                isChecking={derived.cliChecking}
                isProcessing={isProcessing}
                message={messages.cliMessage}
                logs={jobs.cli.logs}
                jobStatus={jobs.cli.status}
                jobError={jobs.cli.error}
                onInstall={actions.handleCliInstall}
              />
            )}

            {currentStep === "gateway" && (
              <GatewayStep
                isReady={derived.gatewayOk}
                autoStarted={autoStarted}
                message={messages.message}
                isProcessing={isProcessing}
                logs={jobs.quickstart.logs}
                jobStatus={jobs.quickstart.status}
                jobError={jobs.quickstart.error}
                onRetry={actions.handleRetry}
              />
            )}

            {currentStep === "token" && (
              <TokenStep
                value={inputs.tokenInput}
                onChange={setInputs.setTokenInput}
                onSubmit={actions.handleTokenSubmit}
                isProcessing={isProcessing}
                message={messages.message}
              />
            )}

            {currentStep === "ai" && (
              <AiStep
                provider={inputs.aiProvider}
                value={inputs.aiKeyInput}
                onProviderChange={setInputs.setAiProvider}
                onChange={setInputs.setAiKeyInput}
                onSubmit={actions.handleAiSubmit}
                isProcessing={isProcessing}
                message={messages.aiMessage}
                configured={derived.aiConfigured}
                missingProviders={derived.aiMissingProviders}
                logs={jobs.aiAuth.logs}
                jobStatus={jobs.aiAuth.status}
                jobError={jobs.aiAuth.error}
                statusError={derived.aiStatusError}
              />
            )}

            {currentStep === "pairing" && (
              <PairingStep
                value={inputs.pairingInput}
                onChange={setInputs.setPairingInput}
                onSubmit={actions.handlePairingSubmit}
                isProcessing={isProcessing}
                message={messages.message}
                pendingPairings={derived.pendingPairings}
                logs={jobs.pairing.logs}
                jobStatus={jobs.pairing.status}
                jobError={jobs.pairing.error}
              />
            )}

            {currentStep === "probe" && (
              <ProbeStep
                isProcessing={isProcessing}
                message={messages.probeMessage}
                logs={jobs.quickstart.logs}
                jobStatus={jobs.quickstart.status}
                jobError={jobs.quickstart.error}
                onRetry={actions.handleProbe}
              />
            )}

            {currentStep === "complete" && (
              <CompleteStep
                probeOk={derived.probeOk}
                onDownloadResource={actions.handleResourceDownload}
                resourceLogs={jobs.resource.logs}
                resourceJobStatus={jobs.resource.status}
                resourceMessage={messages.resourceMessage}
                resourceError={jobs.resource.error}
              />
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
