# 2026-01-31 OpenClaw Manager CLI 核心命令完善

## 迭代完成说明

- CLI 只保留 `start` / `stop` / `stop-all` 三个核心命令并强化体验
- `start` 缺少管理员配置时使用 prompts 交互式输入
- `start` 支持 `--user/--password` 非交互式传参
- `stop` / `stop-all` 提供最佳努力的进程停止
- 直接执行 `openclaw-manager` 输出引导与快捷指令

## 设计文档

- `docs/logs/v0.0.67-cli-core/design.md`

## 使用方式

```bash
# 启动
openclaw-manager start

# 非交互式启动
openclaw-manager start --user admin --password pass

# 停止
openclaw-manager stop

# 停止全部
openclaw-manager stop-all
```

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-test: 非仓库目录启动与停止
cd /tmp
MANAGER_CONFIG_DIR=/tmp/openclaw-manager-smoke \
MANAGER_LOG_PATH=/tmp/openclaw-manager-smoke/openclaw-manager.log \
MANAGER_ERROR_LOG_PATH=/tmp/openclaw-manager-smoke/openclaw-manager.error.log \
MANAGER_API_PORT=17421 \
node /path/to/packages/cli/bin/openclaw-manager.js start --user admin --password pass --non-interactive
node /path/to/packages/cli/bin/openclaw-manager.js stop --api-port 17421 --config-dir /tmp/openclaw-manager-smoke
```

验收点：
- build/lint/tsc 全部通过
- `start` 能写入配置并启动
- `stop` 能停止上述进程并清理 pid

## 发布 / 部署方式

```bash
pnpm deploy:pages
```

线上验收：
- `curl -fsS https://openclaw-manager.com/ > /dev/null`

### npm 发布（已完成）

- 发布版本：`openclaw-manager@0.1.2`
- 执行命令：`pnpm release:publish`

## 影响范围 / 风险

- 影响范围：`packages/cli`（CLI 入口）与 README 文案
- 风险：不同平台进程探测差异导致 `stop-all` 在 Windows 上效果有限
