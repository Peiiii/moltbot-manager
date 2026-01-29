# v0.0.38 Reset Command

## 改了什么

- 新增 `pnpm manager:reset` 清理本地数据，便于重跑安装验证
- 文档补充 reset 的使用方式

## 使用方式

- `pnpm manager:reset`
- 保留 Clawdbot 数据：`pnpm manager:reset -- --keep-clawdbot`

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `node /path/to/clawdbot-manager/scripts/manager-cli.mjs reset --dry-run`

## 发布/部署方式

- 无需发布
