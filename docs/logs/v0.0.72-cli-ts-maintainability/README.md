# 2026-01-31 CLI 迁移 TypeScript 与可维护性重构

## 迭代完成说明

- CLI 从 JS 迁移为 TS，并拆分为模块化结构
- 增加 CLI build/lint 脚本，纳入统一验证
- 保持 start/stop/stop-all 行为与 Banner 体验

## 设计文档

- `docs/logs/v0.0.72-cli-ts-maintainability/design.md`

## 使用方式

```bash
openclaw-manager --help
openclaw-manager start
```

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-test: 非仓库目录验证 help 输出
cd /tmp
node /path/to/packages/cli/bin/openclaw-manager.js --help | rg "openclaw-manager"
```

验收点：
- build/lint/tsc 全部通过
- help 输出包含 Banner 与版本号

## 发布 / 部署方式

```bash
pnpm deploy:pages
```

npm 发布（已完成）：
- 发布版本：`openclaw-manager@0.1.3`
- 执行命令：`pnpm release:publish`

线上验收：
- `curl -fsS https://openclaw-manager.com/ > /dev/null`

## 影响范围 / 风险

- 影响范围：CLI 入口与构建流程
- 风险：若 `bin/` 未重新编译会导致发布产物与源码不一致
