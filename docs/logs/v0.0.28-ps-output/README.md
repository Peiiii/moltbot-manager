# v0.0.28 PS Output Cleanup

## 改了什么

- 优化 `pnpm manager:ps` 输出结构，按区域分组更清晰
- Gateway 列表解析为表格，隐藏冗长环境变量
- 统一 listening pids 输出格式

## 使用方式

- `pnpm manager:ps`

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `node /path/to/clawdbot-manager/scripts/manager-cli.mjs ps`

## 发布/部署方式

- 无需发布
