# 2026-01-30 Onboarding Hook Split

## 背景 / 问题

- `use-onboarding.ts` 仍承载过多逻辑，拆分不彻底，定位与复用成本高

## 决策

- 继续拆分为「类型」「派生」「步骤判定」「副作用」「行为处理」五个模块

## 变更内容

- 新增 `apps/web/src/features/onboarding/onboarding-types.ts`
- 新增 `apps/web/src/features/onboarding/onboarding-derived.ts`
- 新增 `apps/web/src/features/onboarding/onboarding-steps.ts`
- 新增 `apps/web/src/features/onboarding/use-onboarding-actions.ts`
- 新增 `apps/web/src/features/onboarding/use-onboarding-effects.ts`
- 精简 `apps/web/src/features/onboarding/use-onboarding.ts`

## 使用方式

- 功能入口不变，继续通过 Web UI 的引导流程使用

## 验证方式

```bash
pnpm lint
pnpm build

# smoke-check（非仓库目录）
cd /tmp
curl -fsS https://clawdbot-manager.pages.dev/ >/dev/null
```

验收点：

- lint/build 无报错
- Pages 首页可正常返回

## 发布 / 部署

```bash
pnpm deploy:pages
```

## 影响范围 / 风险

- 无行为变更，仅结构拆分
- 风险：拆分遗漏依赖（已通过 lint/build 和线上访问验证）

## 相关文档

- 无
