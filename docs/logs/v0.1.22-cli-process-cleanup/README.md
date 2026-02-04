# 2026-02-04 CLI Process Cleanup

## Background / Problem

- Repeated CLI invocations on VPS can leave orphaned processes, driving CPU usage high.
- Timeouts were only terminating the parent process, not the entire process tree.

## Decision

- Ensure CLI command timeouts terminate the full process group on Unix-like systems.

## Changes

- Command runner now spawns detached process groups and kills the group on timeout.
- Fallback to SIGTERM/SIGKILL to avoid lingering child processes.

## Usage

- No user action required; applies to all backend CLI invocations.

## Verification

```bash
# build / lint / typecheck
pnpm release:check
```

Acceptance:

- Timed-out CLI commands do not leave child processes running.
- CPU usage stabilizes after repeated onboarding checks.

## Release / Deploy

- Deploy updated API build.
- Restart the manager service to pick up the new runner.

## Impact / Risk

- Breaking change: no.
- Risk: aggressive process group termination could end unrelated child processes if a CLI spawns shared services (expected to be isolated).
