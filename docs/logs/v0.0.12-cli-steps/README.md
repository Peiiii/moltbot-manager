# v0.0.12 CLI Step Commands

## 改了什么

- 新增 `scripts/manager-cli.mjs`：覆盖关键步骤的命令行入口
- `package.json` 添加 `pnpm manager:*` 快捷命令
- 对外文档新增 `docs/cli.md`

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `MANAGER_API_URL=http://127.0.0.1:17331 node /Users/peiwang/Projects/clawdbot-manager/scripts/manager-cli.mjs status`

## 发布/部署方式

- 无需发布

## 相关文档

- [CLI 快速验证指南](../../cli.md)
