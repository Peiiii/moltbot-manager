# Clawdbot Manager

面向 Clawdbot 的一键安装、配置、验证与运行控制台。

## 快速开始

```bash
pnpm install
pnpm dev
```

- 默认会自动打开：`http://127.0.0.1:5179`
- API 默认端口：`17321`

## 常用命令

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm build
pnpm lint
```

## Cloudflare Pages 部署

```bash
pnpm deploy:pages
```

可选环境变量：

- `CLOUDFLARE_PAGES_PROJECT`（默认 `clawdbot-manager`）
- `CLOUDFLARE_PAGES_BRANCH`（默认 `main`）
- `VITE_MANAGER_API_URL`（指向可访问的 HTTPS API）

## VPS 一键安装（脚本）

```bash
curl -fsSL https://clawdbot-manager.pages.dev/install.sh | MANAGER_REPO_URL=<git-repo-url> bash
```

可选环境变量：

- `MANAGER_INSTALL_DIR`
- `MANAGER_CONFIG_DIR`
- `MANAGER_ADMIN_USER`
- `MANAGER_ADMIN_PASS`
- `MANAGER_API_HOST`（默认 `0.0.0.0`）
- `MANAGER_API_PORT`（默认 `17321`）

脚本来源：`apps/web/public/install.sh`（`scripts/install.sh` 为本地转发）

## 目录结构

- `apps/web`：Web 前端（React + Vite）
- `apps/api`：本地 API 服务（Hono）
- `packages/*`：预留扩展包（核心逻辑/共享类型/CLI）
# moltbot-manager
