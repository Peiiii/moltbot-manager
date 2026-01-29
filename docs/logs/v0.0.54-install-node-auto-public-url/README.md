# v0.0.54 Install Node Auto + Public URL

## 改了什么

- 安装脚本在缺少 Node.js 时提示并支持自动安装（可选自动同意）
- 安装脚本输出公网访问链接
- 文档补充对应变量说明与示例

## 使用方式

- 自动安装 Node：
  - `MANAGER_AUTO_INSTALL_NODE=1 curl -fsSL https://clawdbot-manager.pages.dev/install.sh | bash`
- 打印公网链接：
  - `MANAGER_PUBLIC_HOST=<public-ip-or-domain> curl -fsSL https://clawdbot-manager.pages.dev/install.sh | bash`

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（非仓库目录）：
  - `MANAGER_REPO_URL=/path/to/clawdbot-manager MANAGER_INSTALL_DIR=/tmp/clawdbot-manager-install-smoke MANAGER_CONFIG_DIR=/tmp/clawdbot-manager-config-smoke MANAGER_ADMIN_USER=admin MANAGER_ADMIN_PASS=pass MANAGER_API_HOST=127.0.0.1 MANAGER_API_PORT=17451 MANAGER_PUBLIC_HOST=127.0.0.1 bash /path/to/clawdbot-manager/apps/web/public/install.sh`
  - `node /path/to/clawdbot-manager/scripts/manager-cli.mjs server-stop -- --config-dir /tmp/clawdbot-manager-config-smoke --pid-file /tmp/clawdbot-manager-config-smoke/manager.pid --api-port 17451`

## 发布/部署方式

- `pnpm deploy:pages`
