# v0.0.27 Manager PS

## 改了什么

- 新增 `pnpm manager:ps`：统一列出当前 Manager API 与 Gateway 实例

## 使用方式

- `pnpm manager:ps`

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `node /path/to/clawdbot-manager/scripts/manager-cli.mjs ps`

## 发布/部署方式

- 无需发布
