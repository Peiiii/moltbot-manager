# 2026-02-04 VPS CLI Install Fallback

## Background / Problem

- OpenClaw CLI installation can fail on VPS due to peer dependency builds (node-llama-cpp) requiring cmake.
- Onboarding cannot save Discord token when the OpenClaw CLI is missing.

## Decision

- Keep OpenClaw-only behavior (no clawdbot compatibility).
- Add automatic fallback install modes for the CLI job to avoid peer deps or scripts when needed.

## Changes

- CLI install job now retries with safer npm flags to avoid peer dependencies and optional packages.
- Final fallback can disable npm scripts while logging the tradeoff.

## Usage

- Use the onboarding "Install CLI" step, or call POST `/api/jobs/cli-install`.
- The backend will attempt the fallback installation automatically if the standard install fails.

## Verification

```bash
# build / lint / typecheck
pnpm release:check

# smoke test (run from a non-repo directory)
cd /tmp
npm i -g openclaw@latest --legacy-peer-deps --omit=optional --ignore-scripts
openclaw --version
```

Acceptance:

- CLI install job completes without requiring cmake on a minimal VPS.
- Discord token save succeeds after CLI install.

## Release / Deploy

- Deploy the updated openclaw-manager API build.
- Run the CLI install job (or use onboarding) on the target VPS.

## Impact / Risk

- Breaking change: no.
- Risk: fallback installs can skip optional features that depend on npm scripts or peer deps.
