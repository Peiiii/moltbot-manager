# Logs

- `docs/logs/v0.0.1-bootstrap/README.md`
- `docs/logs/v0.0.2-cli-quickstart/README.md`
- `docs/logs/v0.0.3-vps-install/README.md`
- `docs/logs/v0.0.4-sse-job-logs/README.md`
- `docs/logs/v0.0.5-cross-platform-install/README.md`
- `docs/logs/v0.0.6-default-repo/README.md`
- `docs/logs/v0.0.7-process-spawn-guard/README.md`
- `docs/logs/v0.0.8-docker-deploy/README.md`
- `docs/logs/v0.0.9-docker-script/README.md`
- `docs/logs/v0.0.10-local-docker-script/README.md`
- `docs/logs/v0.0.11-docker-script-fix/README.md`
- `docs/logs/v0.0.12-cli-steps/README.md`
- `docs/logs/v0.0.13-pairing-wait/README.md`
- `docs/logs/v0.0.14-pairing-prompt/README.md`
- `docs/logs/v0.0.15-probe-retry/README.md`
- `docs/logs/v0.0.16-cli-toml-config/README.md`
- `docs/logs/v0.0.17-cli-user-doc/README.md`
- `docs/logs/v0.0.18-cli-gateway-stop/README.md`
- `docs/logs/v0.0.19-frontend-install-guide/README.md`
- `docs/logs/v0.0.20-install-tty-prompt/README.md`
- `docs/logs/v0.0.21-install-open-url/README.md`

## 写日志的标准

每次改动完成后新增一篇日志文件，至少包含：

- 做了什么（用户可见 + 关键实现点）
- 怎么验证（轻量 smoke-check + `build/lint/typecheck`）
- 怎么发布/部署（如果会影响 npm 包/线上环境；详细流程引用 `docs/workflows/npm-release-process.md`）

模板：`docs/logs/TEMPLATE.md`

## 规划规则

- 规划文档禁止写具体花费时间/工期（例如“3 天”“1 周”）；只写里程碑顺序、交付物与验收标准。
- 规划类文档建议以 `.plan.md` 结尾（例如 `YYYY-MM-DD-xxx.plan.md`），便于区分“规划”与“实现/复盘”
