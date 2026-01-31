# 2026-01-31 Onboarding MVP 领域层重构

## 迭代完成说明

- 引入 Onboarding Domain 层（状态机、selector、ViewModel）
- Presenter/Manager 统一推进与待确认逻辑
- UI 仅使用 ViewModel 渲染，减少跨层耦合

## 设计文档

- `docs/logs/v0.0.78-onboarding-domain-mvp/design.md`

## 使用方式

按原流程使用，UI 会在需要时显示“等待系统确认”提示并自动推进。

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-test: 部署后访问线上页面
curl -fsS https://openclaw-manager.com/ > /dev/null
```

验收点：
- build/lint/tsc 全部通过
- AI/Token/CLI 等步骤成功后提示“等待系统确认”，确认后自动前进

## 发布 / 部署方式

```bash
pnpm deploy:pages
```

npm 发布（如需）：
- `pnpm release:publish`
- 发布版本：`openclaw-manager@0.1.7`

线上验收：
- `curl -fsS https://openclaw-manager.com/ > /dev/null`

## 影响范围 / 风险

- 影响范围：Onboarding 流程推进、状态判断逻辑
- 风险：后端状态不更新时会停留在“待确认”提示
