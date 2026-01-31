# 2026-01-31 CLI 体验：ASCII Banner 与引导输出

## 迭代完成说明

- `openclaw-manager` 无参数时输出 ASCII Banner 与快速指引
- `--help` 输出 Banner + 精简使用说明
- 输出包含版本号，体验对齐顶级 CLI 项目

## 使用方式

```bash
openclaw-manager
openclaw-manager --help
```

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-test: 非仓库目录检查 Banner
cd /tmp
node /path/to/packages/cli/bin/openclaw-manager.js --help | rg "OpenClaw Manager"
```

验收点：
- build/lint/tsc 全部通过
- help 输出包含 Banner 与版本信息

## 发布 / 部署方式

```bash
pnpm deploy:pages
```

npm 发布（如需）：
- `pnpm release:publish`

线上验收：
- `curl -fsS https://openclaw-manager.com/ > /dev/null`

## 影响范围 / 风险

- 影响范围：CLI 输出体验
- 风险：终端宽度不足时 Banner 可能折行
