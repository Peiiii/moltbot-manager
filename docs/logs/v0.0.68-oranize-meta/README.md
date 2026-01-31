# 2026-01-31 AGENTS.md 结构整理

## 迭代完成说明

- 整理 AGENTS.md 结构：合并/去重/重排，明确交付与发布总则
- Rulebook 按主题分组（交付/发布、文档、沟通）
- 保留全部原有语义与约束

## 使用方式

- 直接阅读：`AGENTS.md`

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-test: 非仓库目录校验文档可读
cd /tmp
rg "交付与发布总则" /Users/tongwenwen/Projects/Peiiii/openclaw-manager/AGENTS.md
```

验收点：
- build/lint/tsc 全部通过
- 文档包含“交付与发布总则”章节

## 发布 / 部署方式

```bash
pnpm deploy:pages
```

线上验收：
- `curl -fsS https://openclaw-manager.com/ > /dev/null`

## 影响范围 / 风险

- 影响范围：AGENTS.md（规则组织方式）
- 风险：无
