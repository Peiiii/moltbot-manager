# 开发者指南

面向本项目开发者的“场景 + 链路”指引，按工作环节组织。

## 开发调试

目标：让开发者本地可运行、可修改、可调试。

### 环境准备

```bash
pnpm install
```

### 本地开发启动

```bash
pnpm dev
```

常用环境变量：
- `MANAGER_OPEN_BROWSER=0`：启动时不自动打开浏览器
- `MANAGER_API_PORT=17321`：指定 API 端口
- `MANAGER_AUTH_USERNAME` / `MANAGER_AUTH_PASSWORD`：API 管理员账号
- `VITE_MANAGER_API_URL`：Web 访问的 API 地址

### 单独启动（局部调试）

仅启动 Web：
```bash
pnpm dev:web
```

仅启动 API：
```bash
pnpm dev:api
```

### 自检（构建/类型）

```bash
pnpm lint
pnpm build
```

## 验证

目标：模拟用户操作，验证安装与流程是否可用。

### 1) 本机脚本验证（推荐）

适合模拟“用户在本机执行安装脚本”的流程。

推荐顺序：

```bash
pnpm manager:reset
MANAGER_ADMIN_USER=admin MANAGER_ADMIN_PASS=pass bash scripts/install.sh
```

说明：`scripts/install.sh` 会转发到 `apps/web/public/install.sh`，效果等同线上脚本。

### 2) 远程脚本验证（VPS）

适合模拟“用户在 VPS 上通过 curl 安装”的流程。

```bash
curl -fsSL https://clawdbot-manager.pages.dev/install.sh | MANAGER_ADMIN_USER=admin MANAGER_ADMIN_PASS=pass bash
```

### 3) Docker 验证

适合模拟 VPS 或隔离环境。

```bash
curl -fsSL https://clawdbot-manager.pages.dev/docker.sh | bash
```

**带账号密码（推荐）**

```bash
MANAGER_ADMIN_USER=admin MANAGER_ADMIN_PASS=pass curl -fsSL https://clawdbot-manager.pages.dev/docker.sh | bash
```

**本机脚本验证（等同线上 docker.sh）**

```bash
MANAGER_ADMIN_USER=admin MANAGER_ADMIN_PASS=pass bash scripts/docker.sh
```

### 4) CLI 端到端验证

一键隔离验证：
```bash
pnpm manager:verify
```

需要配对码时，可用非交互流程继续：
```bash
pnpm manager:pairing-approve -- --code "<PAIRING_CODE>" --continue
```

### 5) 部署验证（可选）

```bash
pnpm deploy:pages
```

发布细节见：`docs/deploy.md`。

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

发布细节见：`docs/deploy.md`。  
注：若涉及 npm 发布流程，参考 `docs/workflows/npm-release-process.md`。

## 目录结构速览

- `apps/web`：Web 前端（React + Vite）
- `apps/api`：本地 API 服务（Hono）
- `scripts`：运维/开发脚本
- `docs`：用户文档与开发文档

## 环境要求

- Node.js 22+
- pnpm 10+
