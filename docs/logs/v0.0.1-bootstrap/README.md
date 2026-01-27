# 2026-01-27 Clawdbot Manager 初始化

## 目标

- 独立仓库，面向“安装 + 配置 + 校验 + 运行”的全流程管理工具
- 一条命令启动本地 UI，最小输入完成 Clawdbot 配置
- 可一键部署到 Cloudflare Pages

## 本次交付

- 新仓库结构：`apps/web` + `apps/api` + `packages/*`
- Web UI + API 独立运行，默认 `pnpm dev` 打开页面
- API 通过本地 CLI 驱动安装与探测（`clawdbot`）
- Cloudflare Pages 一键部署：`pnpm deploy:pages`

## 使用方式（开发态）

1. 安装依赖：`pnpm install`
2. 一键启动：`pnpm dev`
3. 打开浏览器：`http://127.0.0.1:5179`

可选环境变量：
- `MANAGER_API_PORT`/`MANAGER_API_HOST`
- `MANAGER_OPEN_BROWSER=0`
- `MANAGER_REPO_ROOT`
- `VITE_MANAGER_API_URL`
- `VITE_CACHE_DIR=/tmp/clawdbot-manager-vite`

## 验证方式

- `pnpm lint`
- `pnpm build`
- 冒烟测试（非仓库目录，/tmp）：
  - `MANAGER_OPEN_BROWSER=0 MANAGER_API_PORT=17331 pnpm --dir /path/to/clawdbot-manager dev`
  - `curl http://127.0.0.1:5179`
  - `curl http://127.0.0.1:17331/api/status`
  
执行结果：全部通过。

## 发布/部署

- Cloudflare Pages：
  - `pnpm deploy:pages`
  - 初始化项目：`pnpm --filter clawdbot-manager-web exec wrangler pages project create clawdbot-manager --production-branch main`
  - 可选环境变量：
    - `CLOUDFLARE_PAGES_PROJECT`（默认 `clawdbot-manager`）
    - `CLOUDFLARE_PAGES_BRANCH`（默认 `main`）
  - 线上冒烟验证：`curl https://<project>.pages.dev`
  - 部署地址：`https://clawdbot-manager.pages.dev`

## 相关文档

- `docs/logs/v0.0.1-bootstrap/manager.plan.md`
