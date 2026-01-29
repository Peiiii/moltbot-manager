# 开发者指南

面向本项目开发者的“场景 + 链路”指引，按工作环节组织。

## 场景 1：首次拉起开发环境

目标：把前后端都跑起来，能访问 Web 并连通 API。

1) 安装依赖
```bash
pnpm install
```

2) 一键启动 Web + API
```bash
pnpm dev
```

常用环境变量：
- `MANAGER_OPEN_BROWSER=0`：启动时不自动打开浏览器
- `MANAGER_API_PORT=17321`：指定 API 端口
- `MANAGER_AUTH_USERNAME` / `MANAGER_AUTH_PASSWORD`：API 管理员账号
- `VITE_MANAGER_API_URL`：Web 访问的 API 地址

## 场景 2：只跑前端 / 只跑后端

目标：局部开发调试，减少干扰。

仅启动 Web：
```bash
pnpm dev:web
```

仅启动 API：
```bash
pnpm dev:api
```

## 场景 3：快速验证一条完整链路

目标：不进 UI，通过 CLI 跑通主要流程。

参考：`docs/cli.md`

## 场景 4：发布前自检

目标：保证基础构建与类型检查通过。

```bash
pnpm lint
pnpm build
```

## 场景 5：验证方式选择

目标：明确“验证目标”与“验证路径”的对应关系。

### A) 只验证前端构建是否正常

```bash
pnpm --filter clawdbot-manager-web build
```

### B) 只验证后端构建是否正常

```bash
pnpm --filter clawdbot-manager-api build
```

### C) 验证 Web 能否连通 API

1) 启动 API  
2) 启动 Web  
3) 浏览器访问页面

```bash
pnpm dev:api
pnpm dev:web
```

### D) 走 CLI 进行端到端验证（推荐）

一键隔离验证：
```bash
pnpm manager:verify
```

需要配对码时，可用非交互流程继续：
```bash
pnpm manager:pairing-approve -- --code "<PAIRING_CODE>" --continue
```

### E) 验证部署链路（可选）

```bash
pnpm deploy:pages
```

### F) 本地安装脚本验证（对标线上 curl 安装）

在仓库根目录执行本地脚本，效果等同于：
`curl -fsSL https://clawdbot-manager.pages.dev/install.sh | ...`

```bash
MANAGER_ADMIN_USER=admin MANAGER_ADMIN_PASS=pass bash scripts/install.sh
```

建议在验证前清理历史数据：

```bash
pnpm manager:reset
```

推荐顺序（完整清理后再安装）：

```bash
pnpm manager:reset
MANAGER_ADMIN_USER=admin MANAGER_ADMIN_PASS=pass bash scripts/install.sh
```

## 场景 5：贡献协作流程

目标：保证协作一致性与可追溯性。

1) 拉取最新主干  
2) 创建本地分支并提交变更  
3) 记录迭代日志（`docs/logs`）  
4) 运行自检（`lint/build`）

## 场景 6：排障

目标：快速判断问题位于前端、后端或部署。

- CLI 相关：`docs/cli.md`
- 安装与部署：`docs/install.md`、`docs/docker.md`

## 场景 7：发布部署

目标：验证部署链路是否可用。

```bash
pnpm deploy:pages
```

注：若涉及 npm 发布流程，参考 `docs/workflows/npm-release-process.md`。

## 目录结构速览

- `apps/web`：Web 前端（React + Vite）
- `apps/api`：本地 API 服务（Hono）
- `scripts`：运维/开发脚本
- `docs`：用户文档与开发文档

## 环境要求

- Node.js 22+
- pnpm 10+
