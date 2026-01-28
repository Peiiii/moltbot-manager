# v0.0.15 Probe Retry

## 改了什么

- 快速启动的通道探测增加重试与延迟，降低刚启动时的误报失败

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `MANAGER_API_URL=http://127.0.0.1:17331 node /path/to/clawdbot-manager/scripts/manager-cli.mjs quickstart --run-probe`

## 发布/部署方式

- 无需发布
