---
description: Stage and commit the current session's work following conventional commits
agent: build
---

Commit the work produced in this session, following the conventional commits
rules in `AGENTS.md` (section "Committing (conventional commits)").

$ARGUMENTS: optional subject override or additional context provided by the
user. If the user supplied a subject, honor it unless it violates the rules.

Follow this workflow:

1. **Inspect the worktree.** Run `git status --porcelain` and
   `git diff HEAD --stat` to see what changed. Read the actual diffs of the
   candidates to understand the nature of each change.

2. **Restrict to this session's work.** Identify the files you changed in this
   session; commit only those. If the worktree contains pre-existing or
   unrelated modifications you did not make, ask the user whether to include
   them or leave them alone.

3. **Classify type and scope.** Determine the type (`feat` / `fix` / `refactor`
   / `chore` / `docs` / `perf` / `test` / `revert`) and pick the scope from the
   table in `AGENTS.md`. When in doubt about either, or when a change could
   reasonably fall under more than one scope, ask the user for clarification
   with concrete options instead of guessing.

4. **Handle cross-scope changes.** If the change genuinely spans multiple
   scopes (e.g. a helper component plus the lesson content that uses it),
   propose splitting it into one commit per scope and confirm the split with
   the user before staging.

5. **Sanity-check before committing.** Run `git diff --check` to catch
   whitespace errors. Never commit secrets: `.env*`, `invites-batch.json`, and
   `invites-in-remote.json` are gitignored. Do not stage or message a `release`
   commit, and do not touch `CHANGELOG.md` / the `package.json` version except
   via `pnpm tag`, `tag:minor`, or `tag:major`.

6. **Stage explicitly, then commit.** Stage the intended paths with
   `git add <path>` (never `git add -A` / `git add .`), then commit with:
   `git commit -m "<type>(<scope>): <subject>" [-m "<body>"]`
   Subject: imperative mood, lowercase, `<= ~72` chars, no trailing period.
   Add a body only when it explains a non-obvious "why". If the user's
   `$ARGUMENTS` include a subject, use it unless it violates the format.

7. **Do not** push, tag, amend, or create empty commits. Report the commit
   hash and full subject (one line per commit) when done.