import type { WizardStep } from "@/components/wizard-sidebar";
import type { JobState } from "@/stores/jobs-store";
import type { OnboardingInputs, OnboardingMessages } from "@/stores/onboarding-store";

import type { OnboardingContext } from "./context";

type JobBundle = {
  cli: JobState<{ version?: string | null }>;
  quickstart: JobState<{ gatewayReady?: boolean; probeOk?: boolean }>;
  pairing: JobState<{ code?: string }>;
  resource: JobState<{ path?: string }>;
  aiAuth: JobState<{ provider?: string }>;
};

export type OnboardingViewModel = {
  currentStep: WizardStep;
  pendingStep: WizardStep | null;
  pendingSince: string | null;
  jobsRunning: boolean;
  auth: {
    username: string;
    password: string;
    isProcessing: boolean;
    message: string | null;
    configured: boolean;
  };
  cli: {
    installed: boolean;
    version: string | null;
    isChecking: boolean;
    isProcessing: boolean;
    message: string | null;
    logs: string[];
    jobStatus: JobState["status"];
    jobError: string | null;
  };
  gateway: {
    isReady: boolean;
    autoStarted: boolean;
    message: string | null;
    isProcessing: boolean;
    logs: string[];
    jobStatus: JobState["status"];
    jobError: string | null;
  };
  token: {
    value: string;
    isProcessing: boolean;
    message: string | null;
  };
  ai: {
    provider: string;
    value: string;
    isProcessing: boolean;
    message: string | null;
    configured: boolean;
    missingProviders: string[];
    logs: string[];
    jobStatus: JobState["status"];
    jobError: string | null;
    statusError: string | null;
  };
  pairing: {
    value: string;
    isProcessing: boolean;
    message: string | null;
    pendingPairings: number;
    logs: string[];
    jobStatus: JobState["status"];
    jobError: string | null;
  };
  probe: {
    isProcessing: boolean;
    message: string | null;
    logs: string[];
    jobStatus: JobState["status"];
    jobError: string | null;
  };
  complete: {
    probeOk: boolean;
    resourceLogs: string[];
    resourceJobStatus: JobState["status"];
    resourceMessage: string | null;
    resourceError: string | null;
  };
};

export function buildOnboardingViewModel(params: {
  state: {
    currentStep: WizardStep;
    pendingStep: WizardStep | null;
    pendingSince: string | null;
    inputs: OnboardingInputs;
    messages: OnboardingMessages;
    isProcessing: boolean;
    autoStarted: boolean;
  };
  context: OnboardingContext;
  jobs: JobBundle;
}): OnboardingViewModel {
  const { state, context, jobs } = params;
  const jobsRunning =
    jobs.cli.status === "running" ||
    jobs.quickstart.status === "running" ||
    jobs.pairing.status === "running" ||
    jobs.resource.status === "running" ||
    jobs.aiAuth.status === "running";

  return {
    currentStep: state.currentStep,
    pendingStep: state.pendingStep,
    pendingSince: state.pendingSince,
    jobsRunning,
    auth: {
      username: state.inputs.authUser,
      password: state.inputs.authPass,
      isProcessing: state.isProcessing,
      message: state.messages.authMessage,
      configured: context.authConfigured
    },
    cli: {
      installed: context.cliInstalled,
      version: context.cliVersion,
      isChecking: context.cliChecking,
      isProcessing: state.isProcessing,
      message: state.messages.cliMessage,
      logs: jobs.cli.logs,
      jobStatus: jobs.cli.status,
      jobError: jobs.cli.error
    },
    gateway: {
      isReady: context.gatewayOk,
      autoStarted: state.autoStarted,
      message: state.messages.message,
      isProcessing: state.isProcessing,
      logs: jobs.quickstart.logs,
      jobStatus: jobs.quickstart.status,
      jobError: jobs.quickstart.error
    },
    token: {
      value: state.inputs.tokenInput,
      isProcessing: state.isProcessing,
      message: state.messages.message
    },
    ai: {
      provider: state.inputs.aiProvider,
      value: state.inputs.aiKeyInput,
      isProcessing: state.isProcessing,
      message: state.messages.aiMessage,
      configured: context.aiConfigured,
      missingProviders: context.aiMissingProviders,
      logs: jobs.aiAuth.logs,
      jobStatus: jobs.aiAuth.status,
      jobError: jobs.aiAuth.error,
      statusError: context.aiStatusError
    },
    pairing: {
      value: state.inputs.pairingInput,
      isProcessing: state.isProcessing,
      message: state.messages.message,
      pendingPairings: context.pendingPairings,
      logs: jobs.pairing.logs,
      jobStatus: jobs.pairing.status,
      jobError: jobs.pairing.error
    },
    probe: {
      isProcessing: state.isProcessing,
      message: state.messages.probeMessage,
      logs: jobs.quickstart.logs,
      jobStatus: jobs.quickstart.status,
      jobError: jobs.quickstart.error
    },
    complete: {
      probeOk: context.probeOk,
      resourceLogs: jobs.resource.logs,
      resourceJobStatus: jobs.resource.status,
      resourceMessage: state.messages.resourceMessage,
      resourceError: jobs.resource.error
    }
  };
}
