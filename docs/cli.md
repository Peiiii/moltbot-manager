# Clawdbot Manager CLI 使用指南

本指南面向需要通过命令行完成配置与配对的用户。

## 前置条件

- 已启动 Clawdbot Manager API
- 已准备管理员账号、Discord Bot Token、AI Provider 与 API Key
- 在仓库内运行命令（`pnpm manager:*`），或直接调用脚本

### 运行方式

在仓库内使用 `pnpm`：
```bash
pnpm manager:status
```

直接调用脚本：
```bash
node scripts/manager-cli.mjs status
```

## 配置文件

默认配置文件：`manager.toml`（可用 `--config` 或 `MANAGER_CONFIG` 指定）。  
建议把该文件加入 `.gitignore`，避免提交敏感信息。

配置优先级：
1) 命令行参数  
2) 环境变量  
3) `manager.toml`  
4) 交互输入（仅在可交互模式下启用）

常用环境变量：
- `MANAGER_API_URL`：API 地址
- `MANAGER_AUTH_USER` / `MANAGER_AUTH_PASS`：管理账号
- `MANAGER_NON_INTERACTIVE=1`：禁用交互提示

## 推荐流程

### 方案 A：交互式输入配对码

1) 在 `manager.toml` 中配置账号与 Token  
2) 执行一键流程，配对码通过交互输入  

```bash
pnpm manager:apply -- --config ./manager.toml
```

### 方案 B：先准备信息，再手动配对

1) 在 `manager.toml` 中配置账号与 Token，不写 `pairing`  
2) 执行一键流程（不触发配对）  
3) 拿到配对码后再单独执行配对并继续探测  

```bash
pnpm manager:apply -- --config ./manager.toml
pnpm manager:pairing-approve -- --code "ABCDE123" --continue
```

### 方案 C：隔离沙盒快速验证

1) 生成隔离环境并启动 API  
2) 使用输出的环境变量执行 `apply`  
3) 验证结束后停止沙盒

```bash
pnpm manager:sandbox -- --print-env
# 可选：--user/--pass 自定义沙盒管理员账号
# 按输出的 export 执行 apply
pnpm manager:sandbox-stop -- --dir "/tmp/clawdbot-manager-sandbox-<timestamp>"
```

### 方案 D：一键隔离验证

```bash
pnpm manager:verify
```

## 完整示例流程

下面是一个从零到验证完成的完整顺序示例（包含配对步骤）。将示例中的占位值替换为你的真实配置，并保存为 `manager.toml`。

### 1) 准备配置文件

```toml
[api]
base = "http://127.0.0.1:17321"

[admin]
user = "admin"
pass = "pass"

[discord]
token = "YOUR_DISCORD_BOT_TOKEN"

[ai]
provider = "minimax-cn"
key = "YOUR_API_KEY"

[gateway]
start = true
probe = false
host = "127.0.0.1"
port = 18789
```

### 2) 启动 API

如果启用了鉴权，请确保 API 启动时使用与 `manager.toml` 一致的管理员账号：

```bash
MANAGER_AUTH_USERNAME=admin MANAGER_AUTH_PASSWORD=pass pnpm dev:api
```

### 3) 检查服务状态

```bash
pnpm manager:status
```

### 4) 保存 Discord Token

```bash
pnpm manager:discord-token -- --config ./manager.toml
```

### 5) 配置 AI Provider

```bash
pnpm manager:ai-auth -- --config ./manager.toml
```

### 6) 快速启动网关（不探测）

```bash
pnpm manager:quickstart -- --config ./manager.toml
```

### 7) 配对（拿到配对码后执行）

```bash
pnpm manager:pairing-approve -- --code "ABCDE123" --continue
```

验收点：
- `pairing-approve` 输出完成提示
- `--continue` 会执行探测，看到探测成功日志

## 常用命令

查看状态：
```bash
pnpm manager:status
```

查看当前运行实例：
```bash
pnpm manager:ps
```

一键隔离验证：
```bash
pnpm manager:verify
```

创建隔离沙盒（快速验证）：
```bash
pnpm manager:sandbox -- --print-env
```

停止隔离沙盒：
```bash
pnpm manager:sandbox-stop -- --dir "/tmp/clawdbot-manager-sandbox-<timestamp>"
```

停止所有实例（manager + sandboxes + gateway）：
```bash
pnpm manager:stop-all
```
预览（不实际停止）：
```bash
pnpm manager:stop-all -- --dry-run
```

快速启动网关：
```bash
pnpm manager:quickstart
```

停止网关：
```bash
pnpm manager:gateway-stop
```

停止管理服务（Manager API）：
```bash
pnpm manager:server-stop
```

执行通道探测：
```bash
pnpm manager:probe
```

保存 Discord Bot Token：
```bash
pnpm manager:discord-token -- --token "YOUR_DISCORD_BOT_TOKEN"
```

配置 AI Provider：
```bash
pnpm manager:ai-auth -- --provider minimax-cn --key "YOUR_API_KEY"
```

批准配对码：
```bash
pnpm manager:pairing-approve -- --code "ABCDE123"
```

交互式输入配对码：
```bash
pnpm manager:pairing-prompt
```

等待配对请求并自动批准：
```bash
pnpm manager:pairing-wait -- --timeout 180000 --poll 3000 --notify
```

## 常见问题

- `unauthorized`：检查 `MANAGER_AUTH_USER/MANAGER_AUTH_PASS`
- `request failed: 404/500`：确认 API 正在运行，且 `--api` 指向正确端口

## 配置样例（TOML）

```toml
[api]
base = "http://127.0.0.1:17321"

[admin]
user = "admin"
pass = "pass"

[install]
cli = true

[discord]
token = "YOUR_DISCORD_BOT_TOKEN"

[ai]
provider = "minimax-cn"
key = "YOUR_API_KEY"

[gateway]
start = true
probe = false
host = "127.0.0.1"
port = 18789

[pairing]
# 三选一：prompt / wait / codes
# prompt = true
# wait = true
# timeoutMs = 180000
# pollMs = 3000
# notify = true
# codes = ["ABCDE123"]
```
