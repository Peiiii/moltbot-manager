# Onboarding 状态机设计

## 目标

- 让 Onboarding 的“进度推进”只有一个权威决策来源
- 消除“任务成功但状态未确认导致卡住”的体验不一致
- 保留现有 MVP 分层：UI 组件不含业务逻辑，逻辑统一在 Manager + Store + 纯函数中

## 核心方案

1) **状态机决策函数**
- 纯函数 `resolveOnboardingFlow` 接收当前步骤、待确认步骤、状态上下文
- 输出 `targetStep / nextStep / pendingStep / clearedPending`
- 仅允许向前推进，不允许回退

2) **待确认机制**
- Token/AI/CLI/网关/配对/探测成功后标记 `pendingStep`
- 当后端 `status` 反映配置生效时清除 `pendingStep`
- UI 展示“等待系统确认”，避免“成功但不前进”的误解

3) **Manager 作为唯一入口**
- `OnboardingManager.handleStatusUpdate` 统一处理 status 更新与推进
- UI 只触发 action，不直接解析业务状态

## 数据流

```
status refresh -> derive context -> handleStatusUpdate -> resolveOnboardingFlow -> store 更新 -> UI
```

## 关键接口

- `OnboardingContext`
  - authRequired/authHeader/cliInstalled/gatewayOk/tokenConfigured/aiConfigured/allowFromConfigured/probeOk
- `OnboardingFlowDecision`
  - targetStep/nextStep/pendingStep/clearedPending/reason

## 风险与边界

- 若后端状态未同步，步骤保持“待确认”而不会强制跳转
- 保持“不回退”策略，避免用户在自动推进中被打回前置步骤
