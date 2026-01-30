# OpenClaw Manager(Clawdbot Manager)
## OpenClaw(Clawdbot) 安装与配置工具

### 安装 Manager

**Mac / Linux**
```bash
curl -fsSL https://claw.cool/install.sh | bash
```
安装过程中会提示设置管理员用户名和密码。

**Windows**（暂未验证过，请谨慎使用）
```powershell
irm https://claw.cool/install.ps1 | iex
```

**Docker**
```bash
curl -fsSL https://claw.cool/docker.sh | bash
```
更多 Docker 参数与说明请见：[docs/get-started-docker.md](docs/get-started-docker.md) 或 [docs/docker.md](docs/docker.md)。

### 使用 Manager 安装 OpenClaw

1. 运行安装命令 → Manager 服务自动启动
2. 打开浏览器访问：`http://localhost:17321`
3. 登录管理面板（安装时设置的用户名和密码）
4. 安装 Clawdbot CLI
5. 配置 Discord Bot Token
6. 配置 AI 模型（API Key）
7. 与 Bot 配对
8. 完成，开始使用
