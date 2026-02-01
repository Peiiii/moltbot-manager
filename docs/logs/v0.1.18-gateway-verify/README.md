# 2026-02-01 网关验证步骤 + 按需启动

## 背景 / 问题

- 网关作为硬性步骤导致流程回跳与阻塞，需要改为“验证网关”并在后续步骤按需启动。

## 决策

- 保留步骤 ID 为 `gateway`，调整语义为“验证网关”。
- 引入 `gatewayVerified` 事件用于记忆已验证状态，避免因网关短暂不可用导致回跳。
- 在 token/ai/pairing/probe 进入时按需触发网关启动，而不是强制作为流程卡点。

## 变更内容

- 用户可见变化
  - 引导步骤「启动网关」改为「验证网关」，提示可按需启动。
  - 在后续步骤进入时自动尝试启动网关（若未就绪）。

- 关键实现点
  - `apps/web/src/features/onboarding/onboarding-steps.ts`：流程判定引入 `gatewayVerified`。
  - `apps/web/src/features/onboarding/domain/context.ts`：上下文新增 `gatewayVerified`。
  - `apps/web/src/managers/onboarding-manager.ts`：状态同步逻辑记忆网关已验证。
  - `apps/web/src/features/onboarding/use-onboarding-effects.ts`：按需启动网关 hook。
  - `apps/web/src/components/wizard-steps.tsx`：网关步骤文案/按钮调整。

## 验证（怎么确认符合预期）

```bash
# build / lint / typecheck
pnpm build:openclaw-manager
pnpm lint
pnpm -r --if-present tsc

# smoke-check（非仓库目录）
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"
npm init -y
npm install openclaw-manager@0.1.18
./node_modules/.bin/openclaw-manager --help
```

验收点：

- build/lint/tsc 全部通过。
- CLI 在临时目录可正常执行并输出 help。

## 发布 / 部署

- 按 `docs/workflows/npm-release-process.md` 执行：
  - `pnpm release:version`
  - `pnpm release:publish`
- 发布结果：`openclaw-manager@0.1.18`。

## 影响范围 / 风险

- Breaking change：否。
- 回滚方式：如需回滚，使用 `npm deprecate openclaw-manager@0.1.18` 并发布修复版本。
