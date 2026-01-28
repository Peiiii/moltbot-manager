# CLI 快速验证指南

目标：用命令行快速跑通每个步骤，便于迭代与回归验证。

## 基础

默认 API 地址：`http://127.0.0.1:17321`  
如需自定义：
- `MANAGER_API_URL=http://127.0.0.1:17331`
- 或 `--api http://127.0.0.1:17331`

如需鉴权：
- `MANAGER_AUTH_USER=admin`
- `MANAGER_AUTH_PASS=pass`

## 步骤命令

查看状态：
```bash
pnpm manager:status
```

启动网关（快速启动）：
```bash
pnpm manager:quickstart
```

执行通道探测：
```bash
pnpm manager:probe
```

保存 Discord Token：
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

## 常见问题

- `unauthorized`：设置 `MANAGER_AUTH_USER/MANAGER_AUTH_PASS`
- `request failed: 404/500`：确认 API 正在运行，且 `--api` 指向正确端口
