# Onboarding MVP 领域层重构设计

## 目标

- 建立单一事实来源：Onboarding 进度与状态判断统一收敛到 Domain 层
- UI 只消费 ViewModel，业务规则集中在 Domain + Manager
- 让“任务成功但状态未确认”的场景有明确、可解释的中间态
- 为未来扩展（更多步骤、更多配置源）提供稳定的扩展面

## 架构分层

```
UI(components) -> Container -> Presenter/Manager -> Domain(use-case + machine) -> Store
```

- **UI 组件**：纯展示组件，仅通过 props 渲染
- **业务组件/容器**：绑定 ViewModel，触发 Presenter 动作
- **Presenter/Manager**：唯一业务入口，协调 jobs/status/store
- **Domain**：纯函数 + 规则，负责状态机与 ViewModel 生成
- **Store**：持久化前端状态（输入、消息、pending）

## 核心模块

- `features/onboarding/domain/flow.ts`
  - `resolveNextStep` / `stepIndex`
  - `isStepSatisfied`
- `features/onboarding/domain/machine.ts`
  - `resolveOnboardingFlow(state, context)` -> 决策推进
- `features/onboarding/domain/selectors.ts`
  - `deriveOnboardingContext(status, loading)`
  - `buildStepViewModel(state, context, jobs)`
- `managers/onboarding-manager.ts`
  - `handleStatusUpdate(context)` 统一推进逻辑
  - `requestConfirmation(step)` 统一“待确认”机制

## 数据流

```
status refresh -> derive context -> handleStatusUpdate -> store 更新 -> ViewModel -> UI
jobs success -> requestConfirmation(step) -> pending -> status confirm -> auto advance
```

## 关键状态

- `currentStep`: 当前步骤
- `pendingStep`: 等待后端确认的步骤
- `pendingSince`: 用于诊断与提示

## 兼容策略

- 不回退策略：只允许向前推进
- `pendingStep` 只在后端确认后清除

## 风险与对策

- 后端状态不更新：UI 会停留在“等待系统确认”，但有明确提示
- 变更范围大：通过 Domain 层隔离、逐步迁移其他模块
