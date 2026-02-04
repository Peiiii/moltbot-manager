# 2026-02-04 Pairing Reset Required

## Background / Problem

- After `reset`, Discord DMs could respond directly without issuing a pairing code.
- The manager was auto-configuring `allowFrom` to `[*]`, effectively bypassing pairing.
- Legacy state under `~/.clawdbot` could still be picked up by the CLI.

## Decision

- Require pairing by default: do not auto-set `allowFrom` during token save.
- Reset should remove legacy clawdbot state to ensure a clean pairing flow.

## Changes

- Token save no longer modifies `channels.discord.dm.allowFrom` automatically.
- Reset now also removes legacy `~/.clawdbot` (or `CLAWDBOT_STATE_DIR`).

## Usage

- Run `pnpm manager:reset` and reconfigure the token.
- The bot should reply with a pairing code after DM.

## Verification

```bash
# build / lint / typecheck
pnpm release:check

# smoke test (non-repo directory)
cd /tmp
node --input-type=module -e "import { resetEnvironmentShared } from '/Users/peiwang/Projects/clawdbot-manager/packages/cli/bin/lib/reset-shared.js'; console.log(resetEnvironmentShared({ flags: { dryRun: true } }));"
```

Acceptance:

- Pairing is required after reset; bot returns a pairing code instead of a direct reply.
- Reset lists a clawdbot legacy path when present.

## Release / Deploy

- Deploy updated API + CLI reset logic.

## Impact / Risk

- Breaking change: no.
- Risk: users who relied on auto-allow DM must pair explicitly.
