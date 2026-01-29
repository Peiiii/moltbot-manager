# v0.0.29 Stop All Command

## 改了什么

- 新增 `pnpm manager:stop-all`：默认停止 manager、sandboxes、gateway 进程
- 提供 `--dry-run` 预览模式，避免误停

## 使用方式

- `pnpm manager:stop-all`
- 预览（不实际停止）：`pnpm manager:stop-all -- --dry-run`

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `node /path/to/clawdbot-manager/scripts/manager-cli.mjs stop-all --dry-run`

## 发布/部署方式

- 无需发布
