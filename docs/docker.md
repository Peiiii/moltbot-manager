# Docker 部署指南（对外）

目标：在 Docker 容器里一键启动管理控制台。

## 一键脚本（推荐）

```bash
curl -fsSL https://clawdbot-manager.pages.dev/docker.sh | bash
```

如果你已经 clone 了仓库，可以直接运行本地脚本：
```bash
bash scripts/docker.sh
```

自定义管理员账号/密码/端口（示例）：
```bash
MANAGER_ADMIN_USER=admin \
MANAGER_ADMIN_PASS=pass \
MANAGER_API_PORT=17321 \
curl -fsSL https://clawdbot-manager.pages.dev/docker.sh | bash
```

打开：
- `http://127.0.0.1:17321/`
- 账号：`admin`
- 密码：`pass`

## 常用命令

查看日志：
```bash
docker logs -f moltbot-manager
```

停止并删除容器：
```bash
docker rm -f moltbot-manager
```

彻底清理（连配置一起删）：
```bash
docker rm -f moltbot-manager
docker volume rm moltbot-manager-config
```

## 可选参数

- `MANAGER_REPO_URL`：自定义仓库地址（默认 `https://github.com/Peiiii/moltbot-manager.git`）
- `MANAGER_API_PORT`：改端口（同时调整 `-p` 映射）

## 手动方式（保留）

如果你需要完全控制镜像与命令行，可以查看历史版本的完整 docker run 命令。
