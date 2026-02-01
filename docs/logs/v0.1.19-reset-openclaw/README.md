# 2026-02-01 reset 同时清理 .openclaw

## 背景 / 问题

- 执行 `manager:reset` 后，OpenClaw 的配对/allowlist 数据仍保留在 `~/.openclaw`，导致无需配对即可使用。

## 决策

- `reset` 目标新增 `~/.openclaw`（或 `OPENCLAW_STATE_DIR`），确保彻底清理配对状态。
- 保持安全检查机制，避免误删非预期路径。

## 变更内容

- 用户可见变化
  - `manager:reset` 会清理 `~/.openclaw`（OpenClaw 状态目录）。

- 关键实现点
  - `packages/cli/src/lib/reset-shared.ts`：新增 openclaw 清理目标与安全白名单。

## 验证（怎么确认符合预期）

```bash
# build / lint / typecheck
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-check（非仓库目录）
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"
openclaw-manager reset --dry-run
```

验收点：

- build/lint/tsc 全部通过。
- dry-run 输出包含 `openclaw` 目标路径。

## 发布 / 部署

- 如需发布 npm，按 `docs/workflows/npm-release-process.md` 执行。

## 影响范围 / 风险

- Breaking change：否。
- 风险：若设置 `OPENCLAW_STATE_DIR` 指向非预期目录，需要 `--force`。
