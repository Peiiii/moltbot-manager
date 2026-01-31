# 2026-01-31 Discord allowFrom 严格格式

## 迭代完成说明

- `channels.discord.dm.allowFrom` 只接受数组格式（不再兼容字符串）
- 保存 Token 时统一写入 `["*"]`，避免配置校验失败

## 使用方式

无需额外操作；若本地已有旧配置（string），请执行 reset 或手动改为数组。

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-test: 非仓库目录验证 allowFrom 仅认数组
cd /tmp
node --input-type=module -e "import { getOnboardingStatus } from '/path/to/openclaw-manager/apps/api/dist/lib/onboarding.js';\
const run = async (_cmd, args) => {\
  const key = args[2];\
  if (args[1] === 'get' && key === 'channels.discord.token') return JSON.stringify('token');\
  if (args[1] === 'get' && key === 'channels.discord.dm.allowFrom') return JSON.stringify(['*']);\
  if (args[0] === 'pairing') return JSON.stringify({ requests: [] });\
  if (args[0] === 'models') return JSON.stringify({ auth: { missingProvidersInUse: [] } });\
  return JSON.stringify(null);\
};\
const status = await getOnboardingStatus(true, run);\
if (!status.discord.allowFromConfigured) throw new Error('allowFrom should be configured');"

node --input-type=module -e "import { getOnboardingStatus } from '/path/to/openclaw-manager/apps/api/dist/lib/onboarding.js';\
const runBad = async (_cmd, args) => {\
  const key = args[2];\
  if (args[1] === 'get' && key === 'channels.discord.token') return JSON.stringify('token');\
  if (args[1] === 'get' && key === 'channels.discord.dm.allowFrom') return JSON.stringify('*');\
  if (args[0] === 'pairing') return JSON.stringify({ requests: [] });\
  if (args[0] === 'models') return JSON.stringify({ auth: { missingProvidersInUse: [] } });\
  return JSON.stringify(null);\
};\
const statusBad = await getOnboardingStatus(true, runBad);\
if (statusBad.discord.allowFromConfigured) throw new Error('string allowFrom should be rejected');"
```

验收点：
- build/lint/tsc 全部通过
- allowFrom 仅数组格式生效

## 发布 / 部署方式

```bash
pnpm deploy:pages
```

npm 发布（如需）：
- `pnpm release:publish`
- 发布版本：`openclaw-manager@0.1.8`

线上验收：
- `curl -fsS https://openclaw-manager.com/ > /dev/null`

## 影响范围 / 风险

- 影响范围：Discord 配置校验
- 风险：旧格式配置会被视为无效（需 reset/手动修复）
