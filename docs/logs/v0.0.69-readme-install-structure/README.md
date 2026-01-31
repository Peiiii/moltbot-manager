# 2026-01-31 README 安装方式结构化

## 迭代完成说明

- README 将安装方式拆分为 NPM 与脚本两类
- 脚本安装细分为 Mac/Linux、Windows、Docker

## 使用方式

- NPM：`npm i -g openclaw-manager` → `openclaw-manager start`
- 脚本：按平台执行 `install.sh` / `install.ps1` / `docker.sh`

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm -r --if-present tsc

# smoke-test: 非仓库目录检查 README 结构
cd /tmp
rg "方式 A：NPM" /path/to/openclaw-manager/README.md
rg "方式 B：脚本安装" /path/to/openclaw-manager/README.md
```

验收点：
- build/lint/tsc 全部通过
- README 中有 NPM/脚本两类结构

## 发布 / 部署方式

```bash
pnpm deploy:pages
```

线上验收：
- `curl -fsS https://openclaw-manager.com/ > /dev/null`

## 影响范围 / 风险

- 影响范围：README 文档结构
- 风险：无
