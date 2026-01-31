# 2026-01-31 Onboarding 状态机与一致性推进

## 迭代完成说明

- 引入 onboarding 状态机决策，统一“状态驱动推进”的单一来源
- 在 Token/AI/CLI/网关/配对/探测等步骤增加“等待状态确认”的待验证机制
- Manager 统一处理状态更新与待验证清理，避免 UI 直接判断业务状态

## 设计文档

- `docs/logs/v0.0.76-onboarding-flow-state-machine/design.md`

## 使用方式

按原流程配置即可，新增逻辑自动在后台判断是否进入下一步。

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
- AI/Token 等步骤成功后若状态未确认，提示“等待系统确认”，确认后自动前进

## 发布 / 部署方式

```bash
pnpm deploy:pages
```

线上验收：
- `curl -fsS https://openclaw-manager.com/ > /dev/null`

## 影响范围 / 风险

- 影响范围：Onboarding 流程推进、状态判断逻辑
- 风险：若后端状态未更新，步骤将保持“待确认”状态（但提示更明确）
