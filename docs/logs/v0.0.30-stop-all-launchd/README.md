# v0.0.30 Stop All Launchd

## 改了什么

- stop-all 在 macOS 下额外尝试卸载 launchd 里的 gateway，避免自动拉起
- 若 gateway 仍在运行则明确报错，提示需要手动介入

## 使用方式

- `pnpm manager:stop-all`

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `node /path/to/clawdbot-manager/scripts/manager-cli.mjs stop-all --dry-run`

## 发布/部署方式

- 无需发布
