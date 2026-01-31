import { create } from "zustand";

import type { WizardStep } from "@/components/wizard-sidebar";

export type OnboardingInputs = {
  tokenInput: string;
  aiProvider: string;
  aiKeyInput: string;
  pairingInput: string;
  authUser: string;
  authPass: string;
};

export type OnboardingMessages = {
  authMessage: string | null;
  message: string | null;
  aiMessage: string | null;
  cliMessage: string | null;
  probeMessage: string | null;
  resourceMessage: string | null;
};

type OnboardingState = {
  currentStep: WizardStep;
  pendingStep: WizardStep | null;
  pendingSince: string | null;
  inputs: OnboardingInputs;
  messages: OnboardingMessages;
  isProcessing: boolean;
  autoStarted: boolean;
  setCurrentStep: (value: WizardStep | ((prev: WizardStep) => WizardStep)) => void;
  setPendingStep: (value: WizardStep | null) => void;
  setTokenInput: (value: string) => void;
  setAiProvider: (value: string) => void;
  setAiKeyInput: (value: string) => void;
  setPairingInput: (value: string) => void;
  setAuthUser: (value: string) => void;
  setAuthPass: (value: string) => void;
  setAuthMessage: (value: string | null) => void;
  setMessage: (value: string | null) => void;
  setAiMessage: (value: string | null) => void;
  setCliMessage: (value: string | null) => void;
  setProbeMessage: (value: string | null) => void;
  setResourceMessage: (value: string | null) => void;
  setIsProcessing: (value: boolean) => void;
  setAutoStarted: (value: boolean) => void;
};

const initialInputs: OnboardingInputs = {
  tokenInput: "",
  aiProvider: "anthropic",
  aiKeyInput: "",
  pairingInput: "",
  authUser: "",
  authPass: ""
};

const initialMessages: OnboardingMessages = {
  authMessage: null,
  message: null,
  aiMessage: null,
  cliMessage: null,
  probeMessage: null,
  resourceMessage: null
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: "auth",
  pendingStep: null,
  pendingSince: null,
  inputs: initialInputs,
  messages: initialMessages,
  isProcessing: false,
  autoStarted: false,
  setCurrentStep: (value) =>
    set((state) => ({
      currentStep: typeof value === "function" ? value(state.currentStep) : value
    })),
  setPendingStep: (value) =>
    set((state) => {
      if (state.pendingStep === value) {
        return state;
      }
      return {
        pendingStep: value,
        pendingSince: value ? new Date().toISOString() : null
      };
    }),
  setTokenInput: (value) =>
    set((state) => ({ inputs: { ...state.inputs, tokenInput: value } })),
  setAiProvider: (value) =>
    set((state) => ({ inputs: { ...state.inputs, aiProvider: value } })),
  setAiKeyInput: (value) =>
    set((state) => ({ inputs: { ...state.inputs, aiKeyInput: value } })),
  setPairingInput: (value) =>
    set((state) => ({ inputs: { ...state.inputs, pairingInput: value } })),
  setAuthUser: (value) =>
    set((state) => ({ inputs: { ...state.inputs, authUser: value } })),
  setAuthPass: (value) =>
    set((state) => ({ inputs: { ...state.inputs, authPass: value } })),
  setAuthMessage: (value) =>
    set((state) => ({ messages: { ...state.messages, authMessage: value } })),
  setMessage: (value) =>
    set((state) => ({ messages: { ...state.messages, message: value } })),
  setAiMessage: (value) =>
    set((state) => ({ messages: { ...state.messages, aiMessage: value } })),
  setCliMessage: (value) =>
    set((state) => ({ messages: { ...state.messages, cliMessage: value } })),
  setProbeMessage: (value) =>
    set((state) => ({ messages: { ...state.messages, probeMessage: value } })),
  setResourceMessage: (value) =>
    set((state) => ({ messages: { ...state.messages, resourceMessage: value } })),
  setIsProcessing: (value) => set({ isProcessing: value }),
  setAutoStarted: (value) => set({ autoStarted: value })
}));
