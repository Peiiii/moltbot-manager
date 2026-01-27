import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { WizardSidebar, MobileProgress, WizardStep } from "@/components/wizard-sidebar";
import { GatewayStep, TokenStep, PairingStep, ProbeStep, CompleteStep } from "@/components/wizard-steps";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function App() {
  const {
    status,
    error,
    refresh,
    setDiscordToken,
    approveDiscordPairing,
    quickstart
  } = useOnboardingStore();

  const [currentStep, setCurrentStep] = useState<WizardStep>("gateway");
  const [tokenInput, setTokenInput] = useState("");
  const [pairingInput, setPairingInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [probeMessage, setProbeMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);

  // Derived states
  const gatewayOk = Boolean(status?.gateway.ok);
  const tokenConfigured = Boolean(status?.onboarding?.discord.tokenConfigured);
  const allowFromConfigured = Boolean(status?.onboarding?.discord.allowFromConfigured);
  const probeOk = status?.onboarding?.probe?.ok === true;
  const pendingPairings = status?.onboarding?.discord.pendingPairings ?? 0;

  // Polling
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Auto-start gateway on mount
  useEffect(() => {
    if (autoStarted || !status) return;
    if (gatewayOk) {
      setAutoStarted(true);
      return;
    }
    const run = async () => {
      setMessage("正在自动启动网关...");
      const result = await quickstart({ startGateway: true, runProbe: false });
      if (result.ok) {
        setMessage("网关正在启动中...");
      } else {
        setMessage(`启动失败: ${result.error}`);
      }
      setAutoStarted(true);
    };
    void run();
  }, [autoStarted, status, gatewayOk, quickstart]);

  // Auto-advance steps based on current state
  useEffect(() => {
    if (!status) return;
    if (probeOk) {
      setCurrentStep("complete");
    } else if (gatewayOk && tokenConfigured && allowFromConfigured) {
      setCurrentStep("probe");
    } else if (gatewayOk && tokenConfigured) {
      setCurrentStep("pairing");
    } else if (gatewayOk) {
      setCurrentStep("token");
    } else {
      setCurrentStep("gateway");
    }
  }, [status, gatewayOk, tokenConfigured, allowFromConfigured, probeOk]);

  // Handlers
  const handleTokenSubmit = useCallback(async () => {
    if (!tokenInput.trim()) return;
    setIsProcessing(true);
    setMessage(null);
    const result = await setDiscordToken(tokenInput);
    if (result.ok) {
      setTokenInput("");
      setMessage("Token 已保存！");
    } else {
      setMessage(`保存失败: ${result.error}`);
    }
    setIsProcessing(false);
  }, [tokenInput, setDiscordToken]);

  const handlePairingSubmit = useCallback(async () => {
    if (!pairingInput.trim()) return;
    setIsProcessing(true);
    setMessage(null);
    setProbeMessage(null);
    const result = await approveDiscordPairing(pairingInput);
    if (result.ok) {
      setPairingInput("");
      setMessage("配对成功！正在验证通道...");
      const probe = await quickstart({ runProbe: true, startGateway: true });
      if (probe.ok && probe.probeOk) {
        setProbeMessage("通道探测通过。");
      } else if (probe.ok) {
        setProbeMessage("通道探测未通过，请重试。");
      } else {
        setProbeMessage(`通道探测失败: ${probe.error ?? "unknown"}`);
      }
    } else {
      setMessage(`配对失败: ${result.error}`);
    }
    setIsProcessing(false);
  }, [pairingInput, approveDiscordPairing, quickstart]);

  const handleRetry = useCallback(async () => {
    setIsProcessing(true);
    setMessage("正在重启网关...");
    await quickstart({ startGateway: true, runProbe: false });
    setIsProcessing(false);
  }, [quickstart]);

  const handleProbe = useCallback(async () => {
    setIsProcessing(true);
    setProbeMessage("正在探测通道...");
    const probe = await quickstart({ runProbe: true, startGateway: true });
    if (probe.ok && probe.probeOk) {
      setProbeMessage("通道探测通过。");
    } else if (probe.ok) {
      setProbeMessage("通道探测未通过，请重试。");
    } else {
      setProbeMessage(`通道探测失败: ${probe.error ?? "unknown"}`);
    }
    setIsProcessing(false);
  }, [quickstart]);

  // Keyboard shortcut: Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !isProcessing) {
        if (currentStep === "token" && tokenInput.trim()) {
          handleTokenSubmit();
        } else if (currentStep === "pairing" && pairingInput.trim()) {
          handlePairingSubmit();
        } else if (currentStep === "probe") {
          handleProbe();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentStep,
    tokenInput,
    pairingInput,
    isProcessing,
    handleTokenSubmit,
    handlePairingSubmit,
    handleProbe
  ]);

  return (
    <div className="min-h-screen bg-bg text-ink flex">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-hero-pattern opacity-90" />
        <div className="absolute left-[-20%] top-[-10%] h-96 w-96 rounded-full bg-accent/15 blur-[150px]" />
        <div className="absolute right-[-10%] bottom-[-10%] h-80 w-80 rounded-full bg-accent-2/20 blur-[140px]" />
      </div>

      {/* Left sidebar */}
      <WizardSidebar currentStep={currentStep} isConnected={Boolean(status)} error={error} />

      {/* Main content area */}
      <main className="relative flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-lg">
          {/* Mobile progress */}
          <MobileProgress currentStep={currentStep} />

          {/* Main wizard card */}
          <Card className="animate-fade-up overflow-hidden">
            {currentStep === "gateway" && (
              <GatewayStep
                isReady={gatewayOk}
                autoStarted={autoStarted}
                message={message}
                isProcessing={isProcessing}
                onRetry={handleRetry}
              />
            )}

            {currentStep === "token" && (
              <TokenStep
                value={tokenInput}
                onChange={setTokenInput}
                onSubmit={handleTokenSubmit}
                isProcessing={isProcessing}
                message={message}
              />
            )}

            {currentStep === "pairing" && (
              <PairingStep
                value={pairingInput}
                onChange={setPairingInput}
                onSubmit={handlePairingSubmit}
                isProcessing={isProcessing}
                message={message}
                pendingPairings={pendingPairings}
              />
            )}

            {currentStep === "probe" && (
              <ProbeStep
                isProcessing={isProcessing}
                message={probeMessage}
                onRetry={handleProbe}
              />
            )}

            {currentStep === "complete" && <CompleteStep probeOk={probeOk} />}
          </Card>
        </div>
      </main>
    </div>
  );
}
