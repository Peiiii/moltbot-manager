# 2026-01-31 README 顶部格式优化

## 迭代完成说明

- README 顶部改为“标题 + 说明引用”结构，保持简约

## 使用方式

- 参考 `README.md` 顶部结构

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-test: 非仓库目录校验顶部结构
cd /tmp
rg "^# OpenClaw Manager" /Users/tongwenwen/Projects/Peiiii/openclaw-manager/README.md
rg "^> OpenClaw" /Users/tongwenwen/Projects/Peiiii/openclaw-manager/README.md
```

验收点：
- build/lint/tsc 全部通过
- README 顶部含标题与引用说明

## 发布 / 部署方式

```bash
pnpm deploy:pages
```

线上验收：
- `curl -fsS https://openclaw-manager.com/ > /dev/null`

## 影响范围 / 风险

- 影响范围：README 顶部格式
- 风险：无
