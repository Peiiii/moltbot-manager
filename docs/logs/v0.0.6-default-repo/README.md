# v0.0.6 Default Repo URL

## 改了什么

- 安装脚本默认使用 `https://github.com/Peiiii/moltbot-manager.git`
- `MANAGER_REPO_URL` 仍可覆盖默认仓库
- README 的一键安装示例移除必填仓库参数

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- 冒烟（线上脚本可访问性，非仓库目录）：
  - `curl -fsSL https://clawdbot-manager.pages.dev/install.sh | head -n 5`
  - `curl -fsSL https://clawdbot-manager.pages.dev/install.ps1 | head -n 5`

## 发布/部署方式

- `pnpm deploy:pages`
