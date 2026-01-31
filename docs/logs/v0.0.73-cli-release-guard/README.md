# 2026-01-31 CLI 发布闭环规则强化

## 迭代完成说明

- 明确“CLI 变更必须执行 npm 发布闭环”规则
- 增加 npm 发布失败的 2FA/权限兜底处理规则

## 使用方式

- 规则入口：`AGENTS.md`

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-test: 非仓库目录校验规则可读
cd /tmp
rg "cli-change-requires-npm-release" /path/to/openclaw-manager/AGENTS.md
```

验收点：
- build/lint/tsc 全部通过
- AGENTS.md 中包含 CLI 发布闭环规则

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

- 影响范围：AGENTS.md 规则
- 风险：无
