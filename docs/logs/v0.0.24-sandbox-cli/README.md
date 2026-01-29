# v0.0.24 Sandbox CLI

## 改了什么

- 新增 `sandbox`/`sandbox-stop` 命令，用于创建隔离验证环境并启动/停止 API
- 自动生成沙盒 `manager.toml` 与环境变量提示，便于快速闭环验证

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `node /path/to/clawdbot-manager/scripts/manager-cli.mjs sandbox --no-start --print-env`

## 发布/部署方式

- 无需发布

## 相关文档

- [CLI 使用指南](../../cli.md)
