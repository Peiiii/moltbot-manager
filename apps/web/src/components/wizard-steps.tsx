import { ArrowRight, Check, ExternalLink, Loader2, Lock, MessageCircle, Search, Shield, Terminal } from "lucide-react";

import { JobLogPanel } from "@/components/job-log-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/store/jobs-store";

// ============================================
// Auth Step
// ============================================

interface AuthStepProps {
    username: string;
    password: string;
    onUsernameChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onSubmit: () => void;
    isProcessing: boolean;
    message: string | null;
    configured: boolean;
}

export function AuthStep({
    username,
    password,
    onUsernameChange,
    onPasswordChange,
    onSubmit,
    isProcessing,
    message,
    configured
}: AuthStepProps) {
    return (
        <div className="space-y-6 p-8">
            <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                    <Lock className="h-8 w-8 text-accent" />
                </div>
                <h2 className="mt-4 text-2xl font-semibold">管理员登录</h2>
                <p className="mt-2 text-sm text-muted">
                    请输入安装时设置的管理员用户名与密码
                </p>
            </div>
            {!configured ? (
                <div className="rounded-2xl bg-warning/10 px-4 py-2 text-sm text-warning text-center">
                    未检测到管理员配置，请先运行安装脚本完成初始化。
                </div>
            ) : null}
            <div className="space-y-4">
                <Input
                    value={username}
                    onChange={(e) => onUsernameChange(e.target.value)}
                    placeholder="管理员用户名"
                    autoFocus
                />
                <Input
                    type="password"
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    placeholder="管理员密码"
                />
                <Button
                    onClick={onSubmit}
                    disabled={!username.trim() || !password || isProcessing || !configured}
                    size="lg"
                    className="w-full"
                >
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            登录
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
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
// CLI Step
// ============================================

interface CliStepProps {
    installed: boolean;
    version: string | null;
    isChecking: boolean;
    isProcessing: boolean;
    message: string | null;
    logs: string[];
    jobStatus: JobStatus;
    jobError: string | null;
    onInstall: () => void;
}

export function CliStep({
    installed,
    version,
    isChecking,
    isProcessing,
    message,
    logs,
    jobStatus,
    jobError,
    onInstall
}: CliStepProps) {
    const statusText = installed
        ? "CLI 已就绪，正在进入下一步..."
        : isChecking
            ? "正在检测本机 CLI 环境..."
            : "未检测到 CLI，请先完成安装。";

    return (
        <div className="space-y-6 p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">
                {installed ? (
                    <Check className="h-10 w-10 text-success animate-bounce-once" />
                ) : isChecking ? (
                    <Loader2 className="h-10 w-10 text-accent animate-spin" />
                ) : (
                    <Terminal className="h-10 w-10 text-accent" />
                )}
            </div>
            <div>
                <h2 className="text-2xl font-semibold">安装 Clawdbot CLI</h2>
                <p className="mt-2 text-sm text-muted">{statusText}</p>
            </div>
            {installed ? (
                <div className="rounded-2xl bg-success/10 px-4 py-2 text-sm text-success text-center">
                    已检测到 CLI{version ? `（${version}）` : ""}。
                </div>
            ) : (
                <Button
                    onClick={onInstall}
                    disabled={isProcessing || isChecking}
                    size="lg"
                    className="w-full"
                >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    一键安装 CLI
                </Button>
            )}
            <div className="rounded-2xl bg-line/20 p-4 text-left text-xs text-muted">
                <div className="mb-2 text-[11px] uppercase tracking-widest text-muted">手动安装</div>
                <code className="break-words">npm i -g clawdbot@latest</code>
                <div className="mt-2 text-[11px]">如提示权限不足，可改用 sudo 执行。</div>
            </div>
            <JobLogPanel title="安装日志" logs={logs} status={jobStatus} />
            {jobStatus === "failed" ? (
                <div className="rounded-2xl bg-warning/10 px-4 py-2 text-xs text-warning text-center">
                    安装失败：{jobError ?? "未知错误"}
                </div>
            ) : null}
            {message && (
                <div className="rounded-2xl bg-line/30 px-4 py-2 text-xs text-muted text-center">
                    {message}
                </div>
            )}
        </div>
    );
}

// ============================================
// Gateway Step
// ============================================

interface GatewayStepProps {
    isReady: boolean;
    autoStarted: boolean;
    message: string | null;
    isProcessing: boolean;
    logs: string[];
    jobStatus: JobStatus;
    jobError: string | null;
    onRetry: () => void;
}

export function GatewayStep({
    isReady,
    autoStarted,
    message,
    isProcessing,
    logs,
    jobStatus,
    jobError,
    onRetry
}: GatewayStepProps) {
    const title = isReady
        ? "网关已就绪"
        : jobStatus === "failed"
            ? "网关启动失败"
            : "正在启动网关...";
    const subtitle = isReady
        ? "正在自动进入下一步..."
        : jobStatus === "failed"
            ? "请查看日志并重试。"
            : "请稍候，网关正在后台启动中";

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
                <h2 className="text-2xl font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-muted">{subtitle}</p>
            </div>
            {!isReady && autoStarted && (
                <Button onClick={onRetry} disabled={isProcessing} variant="outline">
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    重试启动
                </Button>
            )}
            <JobLogPanel title="启动日志" logs={logs} status={jobStatus} />
            {jobStatus === "failed" ? (
                <div className="rounded-2xl bg-warning/10 px-4 py-2 text-xs text-warning">
                    启动失败：{jobError ?? "未知错误"}
                </div>
            ) : null}
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
    logs: string[];
    jobStatus: JobStatus;
    jobError: string | null;
}

export function PairingStep({
    value,
    onChange,
    onSubmit,
    isProcessing,
    message,
    pendingPairings,
    logs,
    jobStatus,
    jobError
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
            <JobLogPanel title="配对日志" logs={logs} status={jobStatus} />
            {jobStatus === "failed" ? (
                <div className="rounded-2xl bg-warning/10 px-4 py-2 text-xs text-warning text-center">
                    配对失败：{jobError ?? "未知错误"}
                </div>
            ) : null}
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
    logs: string[];
    jobStatus: JobStatus;
    jobError: string | null;
    onRetry: () => void;
}

export function ProbeStep({ isProcessing, message, logs, jobStatus, jobError, onRetry }: ProbeStepProps) {
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
            <JobLogPanel title="探测日志" logs={logs} status={jobStatus} />
            {jobStatus === "failed" ? (
                <div className="rounded-2xl bg-warning/10 px-4 py-2 text-xs text-warning text-center">
                    探测失败：{jobError ?? "未知错误"}
                </div>
            ) : null}
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
    onDownloadResource: () => Promise<{ ok: boolean; error?: string }>;
    resourceLogs: string[];
    resourceJobStatus: JobStatus;
    resourceMessage: string | null;
    resourceError: string | null;
}

export function CompleteStep({
    probeOk,
    onDownloadResource,
    resourceLogs,
    resourceJobStatus,
    resourceMessage,
    resourceError
}: CompleteStepProps) {
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

            <div className="space-y-3 rounded-2xl bg-line/20 p-4 text-left">
                <div className="text-sm font-semibold text-ink">可选：下载资源包</div>
                <p className="text-xs text-muted">
                    若你有额外资源（模型/素材/配置），可在此一键下载到本机。
                </p>
                <Button
                    size="sm"
                    className="w-full"
                    onClick={onDownloadResource}
                    disabled={resourceJobStatus === "running"}
                >
                    {resourceJobStatus === "running" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    下载资源
                </Button>
                <JobLogPanel title="资源下载日志" logs={resourceLogs} status={resourceJobStatus} />
                {resourceJobStatus === "failed" ? (
                    <div className="rounded-2xl bg-warning/10 px-4 py-2 text-xs text-warning">
                        下载失败：{resourceError ?? "未知错误"}
                    </div>
                ) : null}
                {resourceMessage && (
                    <div className="rounded-2xl bg-line/30 px-4 py-2 text-xs text-muted">
                        {resourceMessage}
                    </div>
                )}
            </div>
        </div>
    );
}
