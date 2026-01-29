# v0.0.22 CLI Server Stop

## 改了什么

- CLI 新增 `server-stop`，用于停止 Manager API 进程
- CLI 文档与安装指南补充停止命令说明

## 验证方式

- `pnpm -r --if-present lint`
- `pnpm -r --if-present build`
- `pnpm -r --if-present tsc`
- 冒烟（非仓库目录）：
  - `node -e "setInterval(() => {}, 600000)" & echo $! > /tmp/clawdbot-manager-stop/manager.pid`
  - `pnpm manager:server-stop -- --pid-file /tmp/clawdbot-manager-stop/manager.pid`

## 发布/部署方式

- `pnpm deploy:pages`

## 相关文档

- [CLI 使用指南](/cli)
- [安装与前端使用](/install)
