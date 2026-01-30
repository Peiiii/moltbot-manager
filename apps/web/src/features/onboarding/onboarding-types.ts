import type { WizardStep } from "@/components/wizard-sidebar";
import type { JobState, QuickstartResult } from "@/store/jobs-store";

export type OnboardingInputs = {
  tokenInput: string;
  aiProvider: string;
  aiKeyInput: string;
  pairingInput: string;
  authUser: string;
  authPass: string;
};

export type OnboardingInputSetters = {
  setTokenInput: (value: string) => void;
  setAiProvider: (value: string) => void;
  setAiKeyInput: (value: string) => void;
  setPairingInput: (value: string) => void;
  setAuthUser: (value: string) => void;
  setAuthPass: (value: string) => void;
};

export type OnboardingMessages = {
  authMessage: string | null;
  message: string | null;
  aiMessage: string | null;
  cliMessage: string | null;
  probeMessage: string | null;
  resourceMessage: string | null;
};

export type OnboardingMessageSetters = {
  setAuthMessage: (value: string | null) => void;
  setMessage: (value: string | null) => void;
  setAiMessage: (value: string | null) => void;
  setCliMessage: (value: string | null) => void;
  setProbeMessage: (value: string | null) => void;
  setResourceMessage: (value: string | null) => void;
};

export type OnboardingDerived = {
  cliInstalled: boolean;
  cliVersion: string | null;
  gatewayOk: boolean;
  tokenConfigured: boolean;
  aiConfigured: boolean;
  aiMissingProviders: string[];
  aiStatusError: string | null;
  allowFromConfigured: boolean;
  probeOk: boolean;
  pendingPairings: number;
  cliChecking: boolean;
};

export type OnboardingJobs = {
  cli: JobState<{ version?: string | null }>;
  quickstart: JobState<QuickstartResult>;
  pairing: JobState<{ code?: string }>;
  resource: JobState<{ path?: string }>;
  aiAuth: JobState<{ provider?: string }>;
};

export type OnboardingActions = {
  handleAuthSubmit: () => Promise<void>;
  handleCliInstall: () => Promise<void>;
  handleTokenSubmit: () => Promise<void>;
  handleAiSubmit: () => Promise<void>;
  handlePairingSubmit: () => Promise<void>;
  handleRetry: () => Promise<void>;
  handleProbe: () => Promise<void>;
  handleResourceDownload: () => Promise<{ ok: boolean; error?: string }>;
};

export type OnboardingViewModel = {
  state: {
    currentStep: WizardStep;
    isConnected: boolean;
    error: string | null;
    authRequired: boolean;
    authConfigured: boolean;
    inputs: OnboardingInputs;
    messages: OnboardingMessages;
    derived: OnboardingDerived;
    jobs: OnboardingJobs;
    isProcessing: boolean;
    autoStarted: boolean;
  };
  actions: {
    setInputs: OnboardingInputSetters;
  } & OnboardingActions;
};
