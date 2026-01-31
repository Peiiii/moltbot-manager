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
- `docs/logs/v0.0.22-cli-server-stop/README.md`
- `docs/logs/v0.0.23-readme-install-links/README.md`
- `docs/logs/v0.0.24-sandbox-cli/README.md`
- `docs/logs/v0.0.25-sandbox-verify/README.md`
- `docs/logs/v0.0.26-stream-fallback/README.md`
- `docs/logs/v0.0.27-manager-ps/README.md`
- `docs/logs/v0.0.28-ps-output/README.md`
- `docs/logs/v0.0.29-stop-all/README.md`
- `docs/logs/v0.0.30-stop-all-launchd/README.md`
- `docs/logs/v0.0.31-stop-all-retry/README.md`
- `docs/logs/v0.0.32-docs-index/README.md`
- `docs/logs/v0.0.33-dev-docs/README.md`
- `docs/logs/v0.0.34-dev-docs-flow/README.md`
- `docs/logs/v0.0.35-dev-docs-scenarios/README.md`
- `docs/logs/v0.0.36-dev-docs-validation/README.md`
- `docs/logs/v0.0.37-dev-docs-local-install/README.md`
- `docs/logs/v0.0.38-reset-command/README.md`
- `docs/logs/v0.0.39-dev-docs-reset-flow/README.md`
- `docs/logs/v0.0.40-get-started-basic/README.md`
- `docs/logs/v0.0.41-get-started-docker/README.md`
- `docs/logs/v0.0.42-docker-admin-env/README.md`
- `docs/logs/v0.0.43-remote-access-note/README.md`
- `docs/logs/v0.0.44-docker-public-url/README.md`
- `docs/logs/v0.0.45-user-intent-analysis/README.md`
- `docs/logs/v0.0.46-deploy-docs/README.md`
- `docs/logs/v0.0.47-quickstart-logs/README.md`
- `docs/logs/v0.0.48-dev-docs-verify-section/README.md`
- `docs/logs/v0.0.49-dev-docs-dev-vs-verify/README.md`
- `docs/logs/v0.0.50-dev-docs-local-docker/README.md`
- `docs/logs/v0.0.51-docker-timeout-env/README.md`
- `docs/logs/v0.0.52-gateway-timeout-default/README.md`
- `docs/logs/v0.0.53-auto-deploy-default/README.md`
- `docs/logs/v0.0.54-install-node-auto-public-url/README.md`
- `docs/logs/v0.0.55-onboarding-ui-refactor/README.md`
- `docs/logs/v0.0.56-onboarding-hook-split/README.md`
- `docs/logs/v0.0.57-mvp-presenter/README.md`
- `docs/logs/v0.0.58-onboarding-orchestrator/README.md`
- `docs/logs/v0.0.59-windows-install-log/README.md`
- `docs/logs/v0.0.60-windows-install-lightweight/README.md`
- `docs/logs/v0.0.61-npm-cli-start/README.md`
- `docs/logs/v0.0.62-npm-release-pipeline/README.md`
- `docs/logs/v0.0.63-npm-auth-local/README.md`
- `docs/logs/v0.0.64-repo-domain-rename/README.md`
- `docs/logs/v0.0.65-brand-unify/README.md`
- `docs/logs/v0.0.66-readme-clawdbot-compat/README.md`
- `docs/logs/v0.0.67-cli-core/README.md`
- `docs/logs/v0.0.68-oranize-meta/README.md`
- `docs/logs/v0.0.69-readme-install-structure/README.md`
- `docs/logs/v0.0.70-readme-top-format/README.md`
- `docs/logs/v0.0.71-cli-ux-banner/README.md`
- `docs/logs/v0.0.72-cli-ts-maintainability/README.md`
- `docs/logs/v0.0.73-cli-release-guard/README.md`
- `docs/logs/v0.0.74-cli-reset/README.md`
- `docs/logs/v0.0.75-reset-shared/README.md`
- `docs/logs/v0.0.76-onboarding-flow-state-machine/README.md`
- `docs/logs/v0.0.77-npm-release-ui-guard/README.md`
- `docs/logs/v0.0.78-onboarding-domain-mvp/README.md`
- `docs/logs/v0.0.79-discord-allowfrom-strict/README.md`

## 写日志的标准

每次改动完成后新增一篇日志文件，至少包含：

- 做了什么（用户可见 + 关键实现点）
- 怎么验证（轻量 smoke-check + `build/lint/typecheck`）
- 怎么发布/部署（如果会影响 npm 包/线上环境；详细流程引用 `docs/workflows/npm-release-process.md`）

模板：`docs/logs/TEMPLATE.md`

## 规划规则

- 规划文档禁止写具体花费时间/工期（例如“3 天”“1 周”）；只写里程碑顺序、交付物与验收标准。
- 规划类文档建议以 `.plan.md` 结尾（例如 `YYYY-MM-DD-xxx.plan.md`），便于区分“规划”与“实现/复盘”
