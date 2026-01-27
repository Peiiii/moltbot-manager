# 2026-01-27 VPS 一键安装脚本 + 登录保护

## 目标

- 任意 VPS 上通过 `curl` 一键安装并配置管理员账号
- Web UI 访问需要管理员登录
- API 可直接托管 Web 静态资源

## 本次交付

- API 增加 Basic Auth（管理员用户名/密码）
- 新增 `/api/auth/login` 与 `/api/auth/status`
- UI 增加管理员登录步骤
- API 支持静态资源托管（`apps/web/dist`）
- 增加安装脚本：`scripts/install.sh`
- 增加管理员配置生成脚本：`apps/api/scripts/create-admin.mjs`

## 使用方式（VPS）

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

安装完成后访问：`http://<server-ip>:17321`

安装脚本地址：`https://clawdbot-manager.pages.dev/install.sh`

## 验证方式

- `pnpm lint`
- `pnpm build`
- 冒烟测试（非仓库目录，/tmp）：
  - `MANAGER_AUTH_DISABLED=1 MANAGER_OPEN_BROWSER=0 MANAGER_API_PORT=17331 pnpm --dir /path/to/clawdbot-manager dev`
  - `curl http://127.0.0.1:5179`
  - `curl http://127.0.0.1:17331/api/status`

执行结果：全部通过。

## 发布/部署

- Cloudflare Pages：
  - `pnpm deploy:pages`
  - 线上冒烟验证：`curl https://clawdbot-manager.pages.dev`
  - 部署地址：`https://clawdbot-manager.pages.dev`
