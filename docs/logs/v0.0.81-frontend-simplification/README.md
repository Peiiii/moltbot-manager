# v0.0.81 Frontend Simplification (In Progress)

## 迭代完成说明

- 将管理员登录从 onboarding 步骤中移除，改为系统级 Auth Gate
- 登录通过后才进入 onboarding 流程，避免流程语义混乱与状态冗余
- 简化 Auth UI：移除“未配置管理员”分支提示
- auth 拆分为独立 store + manager，遵守 MVP 边界（AuthGate 只订阅 store、动作走 manager）
- 登录门禁默认启用：无 authHeader 一律展示登录页

## 使用方式

- 打开 Web 控制台，先完成登录，再进入配置流程

## 验证方式

- `pnpm build`
- `pnpm lint`
- `pnpm -r --if-present tsc`
- 冒烟：`curl -fsS https://openclaw-manager.com/ > /dev/null`（在非仓库目录执行）

## 发布/部署方式

- `pnpm deploy:pages`
- 按 `docs/workflows/npm-release-process.md` 执行 `pnpm release:publish`
  - 已发布：`openclaw-manager@0.1.12`
