# 基础安装（非 Docker）

适用场景：个人电脑或 VPS，直接安装使用，不依赖 Docker。

## 1) 安装

### Linux / macOS

推荐（带管理员账号）：

```bash
curl -fsSL https://clawdbot-manager.pages.dev/install.sh | MANAGER_ADMIN_USER=admin MANAGER_ADMIN_PASS=pass bash
```

如需自动安装 Node（无交互环境）：

```bash
MANAGER_AUTO_INSTALL_NODE=1 \
MANAGER_ADMIN_USER=admin \
MANAGER_ADMIN_PASS=pass \
curl -fsSL https://clawdbot-manager.pages.dev/install.sh | bash
```

如需交互输入，去掉环境变量即可：

```bash
curl -fsSL https://clawdbot-manager.pages.dev/install.sh | bash
```

脚本会检测 Node.js，缺失时会询问是否自动安装。

### Windows (PowerShell)

```powershell
$env:MANAGER_ADMIN_USER="admin"
$env:MANAGER_ADMIN_PASS="pass"
irm https://clawdbot-manager.pages.dev/install.ps1 | iex
```

## 2) 打开控制台

- 本机访问：`http://127.0.0.1:17321/`
- 远程访问：`http://<your-host>:17321/`

如果是 VPS，请确保防火墙与安全组放行 `17321` 端口。  
如需仅本机访问，可设置 `MANAGER_API_HOST=127.0.0.1`。

## 3) 登录并完成向导

使用安装时设置的管理员账号登录，然后按向导完成：

1) CLI 安装  
2) 启动网关  
3) Discord Token  
4) AI Provider  
5) 配对  
6) 探测

## 4) 快速验证（可选）

```bash
curl -fsS http://<your-host>:17321/health
curl -fsS -u admin:pass http://<your-host>:17321/api/status
```

## 常用环境变量

- `MANAGER_ADMIN_USER` / `MANAGER_ADMIN_PASS`：管理员账号
- `MANAGER_API_PORT`：API 端口（默认 `17321`）
- `MANAGER_API_HOST`：API 绑定地址（默认 `0.0.0.0`，对外可访问）
- `MANAGER_PUBLIC_HOST`：公网地址（用于打印可访问链接）
- `MANAGER_AUTO_INSTALL_NODE=1`：无 Node 时自动安装（无需交互）
