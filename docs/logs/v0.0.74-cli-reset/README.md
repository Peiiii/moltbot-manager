# 2026-01-31 CLI 增加 reset 命令

## 迭代完成说明

- CLI 增加 `reset` 命令：停止所有相关进程并清理本地 Manager 数据
- README 补充 `reset` 使用说明
- 修复 CLI 参数解析对 `--config-dir` 等映射参数不生效的问题

## 使用方式

```bash
openclaw-manager reset
```

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-test: 非仓库目录验证 reset 可执行且可清理测试目录
cd /tmp
mkdir -p "$HOME/.openclaw-manager-reset-test"
node /path/to/packages/cli/bin/openclaw-manager.js reset --config-dir "$HOME/.openclaw-manager-reset-test"
```

验收点：
- build/lint/tsc 全部通过
- reset 命令执行后临时目录被删除

## 发布 / 部署方式

```bash
pnpm deploy:pages
```

npm 发布（如需）：
- `pnpm release:publish`

线上验收：
- `curl -fsS https://openclaw-manager.com/ > /dev/null`

## 影响范围 / 风险

- 影响范围：CLI 命令集、README
- 风险：reset 具有清理能力，需确保仅删除安全路径
