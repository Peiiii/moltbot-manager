# v0.0.21 Install Open URL Output

## 改了什么

- 安装脚本输出同时提示 localhost/127.0.0.1 与局域网地址

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- `pnpm -r --if-present tsc`
- 冒烟（非仓库目录）：
  - `MANAGER_ADMIN_USER=admin MANAGER_ADMIN_PASS=pass MANAGER_INSTALL_DIR=/tmp/clawdbot-manager-install MANAGER_CONFIG_DIR=/tmp/clawdbot-manager-config MANAGER_REPO_URL=/path/to/clawdbot-manager MANAGER_API_PORT=17421 MANAGER_API_HOST=127.0.0.1 bash /path/to/clawdbot-manager/apps/web/public/install.sh`
  - `curl -fsS http://127.0.0.1:17421/health`

## 发布/部署方式

- 无需发布

## 相关文档

- [安装与前端使用](/install)
