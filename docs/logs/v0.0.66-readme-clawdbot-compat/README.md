# 2026-01-31 README 兼容 Clawdbot 文案

## 迭代完成说明

- README 标题与副标题补充 Clawdbot 兼容括号说明
- CLI 安装步骤补充 Clawdbot 命名说明

## 使用方式

- 安装：`curl -fsSL https://openclaw-manager.com/install.sh | bash`
- CLI 启动：`openclaw-manager start`

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-test: 非仓库目录访问线上页面
cd /tmp
curl -fsS https://openclaw-manager.com/ | rg "OpenClaw Manager"
```

验收点：
- build/lint/tsc 全部通过
- 线上页面标题包含 OpenClaw Manager

## 发布 / 部署方式

```bash
pnpm deploy:pages
```

线上验收：
- `curl -fsS https://openclaw-manager.com/ > /dev/null`

## 影响范围 / 风险

- 影响范围：README 文案
- 风险：无
