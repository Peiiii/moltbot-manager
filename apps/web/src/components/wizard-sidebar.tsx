import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardStep = "gateway" | "token" | "pairing" | "probe" | "complete";

export const STEPS = [
    { id: "gateway" as const, label: "启动网关", description: "自动启动本地服务" },
    { id: "token" as const, label: "配置 Token", description: "连接 Discord Bot" },
    { id: "pairing" as const, label: "配对验证", description: "授权用户访问" },
    { id: "probe" as const, label: "通道探测", description: "验证通道连接" },
    { id: "complete" as const, label: "开始使用", description: "一切就绪" }
];

interface WizardSidebarProps {
    currentStep: WizardStep;
    isConnected: boolean;
    error?: string | null;
}

export function WizardSidebar({ currentStep, isConnected, error }: WizardSidebarProps) {
    const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

    return (
        <aside className="relative hidden md:flex w-80 shrink-0 flex-col border-r border-line/40 bg-white/40 backdrop-blur-xl p-8">
            {/* Branding */}
            <div className="mb-10">
                <h1 className="text-xl font-semibold tracking-tight">Clawdbot Manager</h1>
                <p className="mt-1 text-sm text-muted">快速配置向导</p>
            </div>

            {/* Step list */}
            <nav className="flex-1 space-y-2">
                {STEPS.map((step, idx) => {
                    const isFinal = currentStep === "complete" && idx === currentStepIndex;
                    const isCompleted = idx < currentStepIndex || isFinal;
                    const isCurrent = idx === currentStepIndex && !isFinal;

                    return (
                        <div
                            key={step.id}
                            className={cn(
                                "relative flex gap-4 rounded-2xl p-4 transition-all duration-300",
                                isCurrent && "bg-accent/10",
                                isCompleted && "opacity-60"
                            )}
                        >
                            {/* Vertical line connector */}
                            {idx < STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        "absolute left-[2.25rem] top-[3.5rem] w-0.5 h-8 transition-all duration-300",
                                        isCompleted ? "bg-success" : "bg-line/50"
                                    )}
                                />
                            )}
                            {/* Step number */}
                            <div
                                className={cn(
                                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                                    isCompleted
                                        ? "bg-success text-white"
                                        : isCurrent
                                            ? "bg-accent text-white shadow-lg shadow-accent/30"
                                            : "border-2 border-line/50 bg-white text-muted"
                                )}
                            >
                                {isCompleted ? <Check className="h-5 w-5" /> : idx + 1}
                            </div>
                            {/* Step text */}
                            <div className="flex-1 min-w-0">
                                <div
                                    className={cn(
                                        "text-sm font-semibold transition-colors",
                                        isCurrent ? "text-accent" : isCompleted ? "text-success" : "text-muted"
                                    )}
                                >
                                    {step.label}
                                </div>
                                <div className="mt-0.5 text-xs text-muted truncate">{step.description}</div>
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Footer status */}
            <div className="pt-6 border-t border-line/40">
                <div className="flex items-center gap-2 text-xs text-muted">
                    <span
                        className={cn(
                            "h-2 w-2 rounded-full",
                            isConnected ? "bg-success animate-pulse" : "bg-danger"
                        )}
                    />
                    <span>{isConnected ? "已连接" : "连接中..."}</span>
                </div>
                {error && <div className="mt-2 text-xs text-danger">{error}</div>}
            </div>
        </aside>
    );
}

interface MobileProgressProps {
    currentStep: WizardStep;
}

export function MobileProgress({ currentStep }: MobileProgressProps) {
    const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

    return (
        <div className="md:hidden mb-6 flex justify-center gap-2">
            {STEPS.map((step, idx) => {
                const isFinal = currentStep === "complete" && idx === currentStepIndex;
                const isCompleted = idx < currentStepIndex || isFinal;
                const isCurrent = idx === currentStepIndex && !isFinal;
                return (
                    <div
                        key={step.id}
                        className={cn(
                            "h-2 w-2 rounded-full transition-all",
                            isCompleted
                                ? "bg-success"
                                : isCurrent
                                    ? "bg-accent w-6"
                                    : "bg-line/50"
                        )}
                    />
                );
            })}
        </div>
    );
}
