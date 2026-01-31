import { useMemo } from "react";

import { useConfigStore } from "@/stores/config-store";
import { useJobsStore } from "@/stores/jobs-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useStatusStore } from "@/stores/status-store";

import { deriveOnboardingContext } from "./domain/context";
import { buildOnboardingViewModel } from "./domain/view-model";

export function useOnboardingViewModel() {
  const status = useStatusStore((state) => state.status);
  const loading = useStatusStore((state) => state.loading);
  const authRequired = useConfigStore((state) => state.authRequired);
  const authHeader = useConfigStore((state) => state.authHeader);
  const authConfigured = useConfigStore((state) => state.authConfigured);

  const currentStep = useOnboardingStore((store) => store.currentStep);
  const pendingStep = useOnboardingStore((store) => store.pendingStep);
  const pendingSince = useOnboardingStore((store) => store.pendingSince);
  const inputs = useOnboardingStore((store) => store.inputs);
  const messages = useOnboardingStore((store) => store.messages);
  const isProcessing = useOnboardingStore((store) => store.isProcessing);
  const autoStarted = useOnboardingStore((store) => store.autoStarted);

  const cli = useJobsStore((store) => store.cli);
  const quickstart = useJobsStore((store) => store.quickstart);
  const pairing = useJobsStore((store) => store.pairing);
  const resource = useJobsStore((store) => store.resource);
  const aiAuth = useJobsStore((store) => store.aiAuth);

  const context = useMemo(
    () =>
      deriveOnboardingContext({
        status,
        loading,
        authRequired,
        authHeader,
        authConfigured
      }),
    [status, loading, authRequired, authHeader, authConfigured]
  );

  const viewModel = useMemo(
    () =>
      buildOnboardingViewModel({
        state: {
          currentStep,
          pendingStep,
          pendingSince,
          inputs,
          messages,
          isProcessing,
          autoStarted
        },
        context,
        jobs: {
          cli,
          quickstart,
          pairing,
          resource,
          aiAuth
        }
      }),
    [
      currentStep,
      pendingStep,
      pendingSince,
      inputs,
      messages,
      isProcessing,
      autoStarted,
      context,
      cli,
      quickstart,
      pairing,
      resource,
      aiAuth
    ]
  );

  return { context, viewModel };
}
