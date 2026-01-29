# v0.0.47 Quickstart Logs

## 改了什么

- 快速启动网关时补充关键诊断日志（参数、CLI 路径、探测结果、进程状态与排查建议）

## 使用方式

- 在 UI 触发“快速启动”或调用 `/api/jobs/quickstart`

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `MANAGER_API_PORT=17421 MANAGER_API_HOST=127.0.0.1 MANAGER_CONFIG_PATH=/tmp/clawdbot-manager-smoke/config.json MANAGER_WEB_DIST=/path/to/clawdbot-manager/apps/web/dist node /path/to/clawdbot-manager/apps/api/dist/index.js`
  - `curl -fsS http://127.0.0.1:17421/health`

## 发布/部署方式

- 无需发布
