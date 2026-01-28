# 安装与前端使用

本指南面向需要通过脚本一键部署并使用前端控制台的用户。

## 一键安装

### Linux / macOS

```bash
curl -fsSL https://clawdbot-manager.pages.dev/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr https://clawdbot-manager.pages.dev/install.ps1 -UseBasicParsing | iex
```

## Docker 一键启动

```bash
curl -fsSL https://clawdbot-manager.pages.dev/docker.sh | bash
```

更多参数说明见 [Docker 部署指南](/docker)。

## 安装后使用前端

1) 打开浏览器访问：
- `http://<your-host>:17321/`
2) 使用安装脚本设置的管理员账号登录
3) 按向导依次完成：CLI 安装、网关启动、Discord Token、AI Provider、配对、探测

## 常用环境变量

Linux / macOS（示例）：
```bash
MANAGER_ADMIN_USER=admin \
MANAGER_ADMIN_PASS=pass \
MANAGER_API_PORT=17321 \
curl -fsSL https://clawdbot-manager.pages.dev/install.sh | bash
```

Windows PowerShell（示例）：
```powershell
$env:MANAGER_ADMIN_USER="admin"
$env:MANAGER_ADMIN_PASS="pass"
$env:MANAGER_API_PORT="17321"
iwr https://clawdbot-manager.pages.dev/install.ps1 -UseBasicParsing | iex
```

## 常见问题

- 打不开页面：确认 `MANAGER_API_PORT` 端口已放行且服务已启动
- 忘记管理员账号：请重新运行安装脚本并设置新的管理员账号
