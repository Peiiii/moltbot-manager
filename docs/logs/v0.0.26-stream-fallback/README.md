# v0.0.26 Job Stream Fallback

## 改了什么

- `manager-cli` 在 Job SSE 404 时自动重试，并回退到轮询 `/api/jobs/:id`

## 使用方式

- 直接执行：`pnpm manager:verify`

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `node /path/to/clawdbot-manager/scripts/manager-cli.mjs verify --no-start --print-env`

## 发布/部署方式

- 无需发布
