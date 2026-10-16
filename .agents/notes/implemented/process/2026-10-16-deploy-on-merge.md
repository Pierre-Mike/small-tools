# Agent Note: Deploy on merge to main

Status: implemented

## Problem

The app had no way to reach Cloudflare from CI. `ci.yml` only runs `axioms deploy --dry-run`,
which needs no account, and `wrangler.jsonc` still held the placeholder D1 `database_id`, so
`axioms deploy` refused to run anywhere.

## Decision

Every push to `main` deploys to Cloudflare Workers at `https://small-tools.pm-lemeliner.workers.dev`.

- `.github/workflows/deploy.yml` runs `bunx axioms deploy` on `push` to `main`, and by hand through
  `workflow_dispatch`. The command refuses on placeholders, repeats the dry run, applies D1
  migrations remotely, then runs `wrangler deploy`.
- The job reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from repository secrets, only in
  the deploy step. The token needs Workers Scripts:Edit and D1:Edit on the account.
- The job runs in a `production` GitHub environment, which records each deploy and its URL.
- Deploys never run in parallel and are never cancelled halfway (`concurrency: deploy-production`,
  `cancel-in-progress: false`).
- The D1 database `small-tools` exists on the account (id `5424c62f-bab9-49d4-8c82-7b8152103115`,
  region ENAM), and `wrangler.jsonc` points at it.

## Alternatives considered

**A deploy job in `ci.yml` that `needs` every gate.** It would deploy only after this run's gates
pass, but `axioms ci-dry-run` replays every `ci.yml` job in a fresh clone, so a pre-push replay
would try to deploy. Branch protection already requires the `ci.yml` checks on the PR before merge,
and linear history keeps the merged commit equal to the tested one, so a separate workflow loses
little.

**A `workflow_run` trigger on a successful `ci` run.** It gates on the push run as well, but
zizmor flags `workflow_run` as a dangerous trigger, and it adds a second hop for no extra safety
given the required checks.

**Deploy by hand with `bun run deploy`.** It needs a logged-in machine and is easy to forget.

## Consequences

- Merging a PR ships it. A change that should not go live yet must stay unmerged.
- The deploy reruns the dry run, so a broken bundle still fails before anything uploads.
- Migrations apply before the new worker goes live, so a migration must stay compatible with the
  worker version that is still running.
- Rotating the API token only means updating the `CLOUDFLARE_API_TOKEN` secret.

## Verification

- `bun run deploy:dry` passes with the real `database_id` and reports no placeholders.
- `bunx axioms lint-workflows` passes on both workflows (actionlint and zizmor).
- The first run of `deploy.yml` after this merges is the end-to-end check.
