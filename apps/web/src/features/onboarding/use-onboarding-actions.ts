import { useCallback } from "react";

import type {
  OnboardingActions,
  OnboardingInputSetters,
  OnboardingInputs,
  OnboardingMessageSetters
} from "./onboarding-types";

type UseOnboardingActionsParams = {
  inputs: OnboardingInputs;
  setInputs: OnboardingInputSetters;
  setMessages: OnboardingMessageSetters;
  setIsProcessing: (value: boolean) => void;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
  setDiscordToken: (token: string) => Promise<{ ok: boolean; error?: string }>;
  startCliInstallJob: () => Promise<{ ok: boolean; error?: string }>;
  startQuickstartJob: (opts: { runProbe?: boolean; startGateway?: boolean }) => Promise<{
    ok: boolean;
    error?: string;
    result?: { gatewayReady?: boolean; probeOk?: boolean } | null;
  }>;
  startPairingJob: (code: string) => Promise<{ ok: boolean; error?: string }>;
  startResourceDownloadJob: (opts?: {
    url?: string;
    filename?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  startAiAuthJob: (provider: string, apiKey: string) => Promise<{ ok: boolean; error?: string }>;
};

export function useOnboardingActions(params: UseOnboardingActionsParams): OnboardingActions {
  const {
    inputs,
    setInputs,
    setMessages,
    setIsProcessing,
    login,
    refresh,
    setDiscordToken,
    startCliInstallJob,
    startQuickstartJob,
    startPairingJob,
    startResourceDownloadJob,
    startAiAuthJob
  } = params;

  const handleAuthSubmit = useCallback(async () => {
    if (!inputs.authUser.trim() || !inputs.authPass.trim()) return;
    setIsProcessing(true);
    setMessages.setAuthMessage(null);
    const result = await login(inputs.authUser, inputs.authPass);
    if (result.ok) {
      setMessages.setAuthMessage("登录成功，正在加载配置...");
      setInputs.setAuthPass("");
      await refresh();
    } else {
      setMessages.setAuthMessage(`登录失败: ${result.error}`);
    }
    setIsProcessing(false);
  }, [inputs.authUser, inputs.authPass, login, refresh, setInputs, setMessages, setIsProcessing]);

  const handleCliInstall = useCallback(async () => {
    setIsProcessing(true);
    setMessages.setCliMessage("正在启动安装任务...");
    const result = await startCliInstallJob();
    if (!result.ok) {
      setMessages.setCliMessage(`安装失败: ${result.error}`);
    } else {
      setMessages.setCliMessage("安装完成，正在刷新状态...");
    }
    setIsProcessing(false);
  }, [setMessages, setIsProcessing, startCliInstallJob]);

  const handleTokenSubmit = useCallback(async () => {
    if (!inputs.tokenInput.trim()) return;
    setIsProcessing(true);
    setMessages.setMessage(null);
    const result = await setDiscordToken(inputs.tokenInput);
    if (result.ok) {
      setInputs.setTokenInput("");
      setMessages.setMessage("Token 已保存！");
    } else {
      setMessages.setMessage(`保存失败: ${result.error}`);
    }
    setIsProcessing(false);
  }, [inputs.tokenInput, setDiscordToken, setInputs, setMessages, setIsProcessing]);

  const handleAiSubmit = useCallback(async () => {
    if (!inputs.aiKeyInput.trim()) return;
    setIsProcessing(true);
    setMessages.setAiMessage(null);
    const result = await startAiAuthJob(inputs.aiProvider, inputs.aiKeyInput.trim());
    if (result.ok) {
      setInputs.setAiKeyInput("");
      setMessages.setAiMessage("AI 凭证已保存。");
    } else {
      setMessages.setAiMessage(`配置失败: ${result.error}`);
    }
    setIsProcessing(false);
  }, [
    inputs.aiKeyInput,
    inputs.aiProvider,
    setInputs,
    setMessages,
    setIsProcessing,
    startAiAuthJob
  ]);

  const handlePairingSubmit = useCallback(async () => {
    if (!inputs.pairingInput.trim()) return;
    setIsProcessing(true);
    setMessages.setMessage(null);
    setMessages.setProbeMessage(null);
    const result = await startPairingJob(inputs.pairingInput);
    if (result.ok) {
      setInputs.setPairingInput("");
      setMessages.setMessage("配对成功！正在验证通道...");
      const probe = await startQuickstartJob({ runProbe: true, startGateway: true });
      if (probe.ok && probe.result?.probeOk) {
        setMessages.setProbeMessage("通道探测通过。");
      } else if (probe.ok) {
        setMessages.setProbeMessage("通道探测未通过，请重试。");
      } else {
        setMessages.setProbeMessage(`通道探测失败: ${probe.error ?? "unknown"}`);
      }
    } else {
      setMessages.setMessage(`配对失败: ${result.error}`);
    }
    setIsProcessing(false);
  }, [
    inputs.pairingInput,
    setInputs,
    setMessages,
    setIsProcessing,
    startPairingJob,
    startQuickstartJob
  ]);

  const handleRetry = useCallback(async () => {
    setIsProcessing(true);
    setMessages.setMessage("正在重启网关...");
    const result = await startQuickstartJob({ startGateway: true, runProbe: false });
    if (!result.ok) {
      setMessages.setMessage(`启动失败: ${result.error}`);
    } else if (result.result?.gatewayReady) {
      setMessages.setMessage("网关已就绪。");
    } else {
      setMessages.setMessage("网关正在启动中...");
    }
    setIsProcessing(false);
  }, [setMessages, setIsProcessing, startQuickstartJob]);

  const handleProbe = useCallback(async () => {
    setIsProcessing(true);
    setMessages.setProbeMessage("正在探测通道...");
    const probe = await startQuickstartJob({ runProbe: true, startGateway: true });
    if (probe.ok && probe.result?.probeOk) {
      setMessages.setProbeMessage("通道探测通过。");
    } else if (probe.ok) {
      setMessages.setProbeMessage("通道探测未通过，请重试。");
    } else {
      setMessages.setProbeMessage(`通道探测失败: ${probe.error ?? "unknown"}`);
    }
    setIsProcessing(false);
  }, [setMessages, setIsProcessing, startQuickstartJob]);

  const handleResourceDownload = useCallback(async () => {
    setMessages.setResourceMessage("正在下载资源...");
    const result = await startResourceDownloadJob();
    if (result.ok) {
      setMessages.setResourceMessage("资源下载完成。");
    } else {
      setMessages.setResourceMessage(`下载失败: ${result.error}`);
    }
    return result;
  }, [setMessages, startResourceDownloadJob]);

  return {
    handleAuthSubmit,
    handleCliInstall,
    handleTokenSubmit,
    handleAiSubmit,
    handlePairingSubmit,
    handleRetry,
    handleProbe,
    handleResourceDownload
  };
}
