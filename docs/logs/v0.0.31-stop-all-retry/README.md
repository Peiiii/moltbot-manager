# v0.0.31 Stop All Retry

## 改了什么

- stop-all 对已不存在的 sandbox pid 不再报错，视为已停止
- stop-all 对 gateway 加入短暂等待与重试，避免误报“仍在运行”

## 使用方式

- `pnpm manager:stop-all`

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `node /path/to/clawdbot-manager/scripts/manager-cli.mjs stop-all --dry-run`

## 发布/部署方式

- 无需发布
