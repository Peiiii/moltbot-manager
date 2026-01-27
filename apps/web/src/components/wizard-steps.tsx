import { ArrowRight, Check, ExternalLink, Loader2, MessageCircle, Search, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ============================================
// Gateway Step
// ============================================

interface GatewayStepProps {
    isReady: boolean;
    autoStarted: boolean;
    message: string | null;
    isProcessing: boolean;
    onRetry: () => void;
}

export function GatewayStep({ isReady, autoStarted, message, isProcessing, onRetry }: GatewayStepProps) {
    return (
        <div className="space-y-6 p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">
                {isReady ? (
                    <Check className="h-10 w-10 text-success animate-bounce-once" />
                ) : (
                    <Loader2 className="h-10 w-10 text-accent animate-spin" />
                )}
            </div>
            <div>
                <h2 className="text-2xl font-semibold">
                    {isReady ? "网关已就绪" : "正在启动网关..."}
                </h2>
                <p className="mt-2 text-sm text-muted">
                    {isReady ? "正在自动进入下一步..." : "请稍候，网关正在后台启动中"}
                </p>
            </div>
            {!isReady && autoStarted && (
                <Button onClick={onRetry} disabled={isProcessing} variant="outline">
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    重试启动
                </Button>
            )}
            {message && (
                <div className="rounded-2xl bg-line/30 px-4 py-2 text-xs text-muted">{message}</div>
            )}
        </div>
    );
}

// ============================================
// Token Step
// ============================================

interface TokenStepProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    isProcessing: boolean;
    message: string | null;
}

export function TokenStep({ value, onChange, onSubmit, isProcessing, message }: TokenStepProps) {
    return (
        <div className="space-y-6 p-8">
            <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                    <Shield className="h-8 w-8 text-accent" />
                </div>
                <h2 className="mt-4 text-2xl font-semibold">配置 Discord Bot Token</h2>
                <p className="mt-2 text-sm text-muted">粘贴您的 Discord Bot Token 以建立连接</p>
            </div>
            <div className="space-y-4">
                <Input
                    type="password"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="粘贴 Bot Token..."
                    className="text-center"
                    autoFocus
                />
                <Button
                    onClick={onSubmit}
                    disabled={!value.trim() || isProcessing}
                    size="lg"
                    className="w-full"
                >
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            继续
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
                <a
                    href="https://discord.com/developers/applications"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-accent transition"
                >
                    如何获取 Token?
                    <ExternalLink className="h-3 w-3" />
                </a>
                <span className="hidden sm:inline">按 Enter 继续</span>
            </div>
            {message && (
                <div className="rounded-2xl bg-line/30 px-4 py-2 text-xs text-muted text-center">
                    {message}
                </div>
            )}
        </div>
    );
}

// ============================================
// Pairing Step
// ============================================

interface PairingStepProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    isProcessing: boolean;
    message: string | null;
    pendingPairings: number;
}

export function PairingStep({
    value,
    onChange,
    onSubmit,
    isProcessing,
    message,
    pendingPairings
}: PairingStepProps) {
    return (
        <div className="space-y-6 p-8">
            <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                    <MessageCircle className="h-8 w-8 text-accent" />
                </div>
                <h2 className="mt-4 text-2xl font-semibold">配对 Discord</h2>
                <p className="mt-2 text-sm text-muted">在 Discord 中私信您的 Bot，获取配对码</p>
            </div>

            {/* Instructions */}
            <div className="space-y-3 rounded-2xl bg-line/20 p-4">
                <div className="flex items-start gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                        1
                    </span>
                    <span className="text-muted">打开 Discord，找到您的 Bot</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                        2
                    </span>
                    <span className="text-muted">发送任意消息获取配对码</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                        3
                    </span>
                    <span className="text-muted">在下方输入配对码</span>
                </div>
            </div>

            {pendingPairings > 0 && (
                <div className="rounded-2xl bg-success/10 px-4 py-2 text-sm text-success text-center">
                    🎉 检测到 {pendingPairings} 个待配对请求！
                </div>
            )}

            <div className="space-y-4">
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value.toUpperCase())}
                    placeholder="输入配对码，如 ABC123"
                    className="text-center font-mono text-lg tracking-widest"
                    maxLength={10}
                    autoFocus
                />
                <Button
                    onClick={onSubmit}
                    disabled={!value.trim() || isProcessing}
                    size="lg"
                    className="w-full"
                >
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            验证配对
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
            <div className="text-center text-xs text-muted">按 Enter 继续</div>
            {message && (
                <div className="rounded-2xl bg-line/30 px-4 py-2 text-xs text-muted text-center">
                    {message}
                </div>
            )}
        </div>
    );
}

// ============================================
// Probe Step
// ============================================

interface ProbeStepProps {
    isProcessing: boolean;
    message: string | null;
    onRetry: () => void;
}

export function ProbeStep({ isProcessing, message, onRetry }: ProbeStepProps) {
    return (
        <div className="space-y-6 p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">
                {isProcessing ? (
                    <Loader2 className="h-10 w-10 text-accent animate-spin" />
                ) : (
                    <Search className="h-10 w-10 text-accent" />
                )}
            </div>
            <div>
                <h2 className="text-2xl font-semibold">通道探测</h2>
                <p className="mt-2 text-sm text-muted">
                    我们会自动验证通道连接，失败时可点击重试。
                </p>
            </div>
            <Button onClick={onRetry} disabled={isProcessing} size="lg" className="w-full">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                重新探测
            </Button>
            {message && (
                <div className="rounded-2xl bg-line/30 px-4 py-2 text-xs text-muted text-center">
                    {message}
                </div>
            )}
        </div>
    );
}

// ============================================
// Complete Step
// ============================================

interface CompleteStepProps {
    probeOk: boolean;
}

export function CompleteStep({ probeOk }: CompleteStepProps) {
    return (
        <div className="space-y-6 p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-success/10">
                <Check className="h-10 w-10 text-success" />
            </div>
            <div>
                <h2 className="text-2xl font-semibold text-success">🎉 设置完成!</h2>
                <p className="mt-2 text-sm text-muted">Clawdbot 已成功配置并连接</p>
            </div>

            <div className="space-y-3 rounded-2xl bg-line/20 p-4 text-left">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">网关状态</span>
                    <span className="font-semibold text-success">● 在线</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Bot 连接</span>
                    <span className="font-semibold text-success">● 已连接</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">通道探测</span>
                    <span className={cn("font-semibold", probeOk ? "text-success" : "text-warning")}>
                        {probeOk ? "● 通过" : "○ 待验证"}
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                <Button size="lg" className="w-full">
                    开始对话
                    <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-xs text-muted">现在可以在 Discord 中与 Bot 对话了</p>
            </div>
        </div>
    );
}
