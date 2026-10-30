---
name: dev-flow
description: End-to-end delivery flow for app-devper/alert-web — from an idea or bug through shaping, design, test-first build, verify, review, PR into develop, release PR into main, tag, deploy check and back-merge. Says which skill to use at each stage. Use when starting any change, when unsure what comes next, or when asked to ship, release or hotfix.
---

# dev-flow — idea → release for alert-web

One flow, nine stages. Each stage names the skill that does the work and the
exit check that must hold before moving on. Skip a stage only where it says
so. Branching and PR mechanics are owned by `git-flow` and `pr`; this skill
only sequences them.

## 0. Pick the track

| Track | Starts at | Branch from → PR into |
|---|---|---|
| Feature / change | 1 | `develop` → `develop` (`feature/<slug>`) |
| Bug fix (not urgent) | 1 (short) | `develop` → `develop` (`feature/fix-<slug>`) |
| Refactor | 1 via `improve-codebase-architecture` | `develop` → `develop` |
| Release | 8 | `develop` → `main` (`release/X.Y.Z`) |
| Hotfix (production broken) | 9 | `main` → `main` (`hotfix/<slug>`) |

## 1. Shape — agree on what and why

- New behaviour or unclear requirement → `/grill-with-docs` (runs `grilling`
  + `domain-modeling`). Terms go into `CONTEXT.md`, hard-to-reverse decisions
  into `docs/adr/`.
- Small, well-understood fix → `grilling` only, a few questions, no docs.
- Refactor → `/improve-codebase-architecture` picks the candidate and grills it.

**Exit:** one or two sentences stating the change and how we will know it works.

## 2. Design — decide the shape of the code

- `codebase-design` for module/interface boundaries (deep modules, seams).
- Stack references: `react-patterns`, `frontend-patterns`, `nextjs-turbopack`, `frontend-a11y` (forms, dialogs, keyboard).

**Exit:** files/modules to touch are known; any new term is in `CONTEXT.md`.

## 3. Branch

`git-flow` → `feature/<slug>` from an up-to-date `develop`. One concern per
branch.

## 4. Build

This repo has **no test runner** (no vitest/jest/Playwright), so there is no test-first step. Keep logic in plain functions/hooks so tests can be added later, and prove the change in the running app (stage 5).

Commit in small conventional commits: `feat(scope): …`, `fix(scope): …`,
`refactor(scope): …`, `test(scope): …`, `chore(scope): …`.

## 5. Verify locally — same gates as CI (`build`)

```bash
npm ci          # only if package-lock.json changed
npm run lint
npm run build
```

`npm run dev`, open the changed pages and click through the flow (the `run` skill can drive a browser and take screenshots).

**Exit:** everything above is green and the change was seen working — not
just compiled.

## 6. Review

`coding-standards`, `frontend-a11y`, `react-performance`, then `/code-review`. Fix findings before opening the PR.

## 7. PR into develop

```bash
git push -u origin feature/<slug>
gh pr create --base develop --title "feat(scope): …" --body "…"
```

Body: what changed, why, how it was verified (stage 5). Land it with the
`pr` skill (squash, delete branch, sync `develop`). Never push to `develop`
directly.

## 8. Release — develop → main

1. **Pick the version** from what landed since the last tag
   (`git log $(git describe --tags --abbrev=0 --match 'v*' origin/main)..origin/develop --oneline`):
   breaking → major, any `feat` → minor, only `fix` → patch.
2. **Cut the branch:** `git-flow` release recipe → `release/X.Y.Z` from `develop`.
3. **Version:** Bump `"version"` in `package.json` to `X.Y.Z` (`npm version X.Y.Z --no-git-tag-version`).
4. **PR:** `gh pr create --base main --title "release: vX.Y.Z" --body "<changelog: PR list since last tag>"`.
   CI `build` must be green.
5. **Land:** `pr` skill (squash into `main`).
6. **Deploy:** Merging into `main` fires Cloud Build trigger `deploy-alert-web` (project `devperpos`, [cloudbuild.yaml](../../../cloudbuild.yaml)): build → `firebase deploy --only hosting:devper-alert`.
7. **Tag:** Tag by hand — nothing tags automatically.
   ```bash
   git checkout main && git pull --ff-only
   git tag -a vX.Y.Z -m "vX.Y.Z" HEAD   # HEAD = the "release: vX.Y.Z (#n)" squash commit
   git push origin vX.Y.Z
   ```
8. **Back-merge** `main` → `develop` (`git-flow`; the `pr` skill does it
   after a PR into `main`).
9. **Check the deploy:**
   ```bash
   gcloud builds list --project=devperpos --region=global --limit=1 \
     --filter="substitutions.TRIGGER_NAME=deploy-alert-web" --format="value(status,createTime,substitutions.SHORT_SHA)"
   # then open https://devper-alert.web.app and check the release
   ```

**Exit:** tag `vX.Y.Z` on `main`, the build for that commit SUCCESS, `develop` contains `main`.

## 9. Hotfix — production is broken

`git-flow` hotfix recipe: `hotfix/<slug>` from `main` → stages 4–6 (test
reproducing the bug first) → PR into `main` titled `fix(scope): …` → release
steps 3 and 5–9 with a **patch** bump.

## Guard rails

- No direct pushes to `main` or `develop` except the stage-8 back-merge
  (admin only, see `git-flow`); every other change goes through a PR
  with `build` green.
- A merge into `main` is a release and a production deploy —
  only `release/*` and `hotfix/*` PRs target `main`.
- Never tag a commit that is not on `main`; never move or delete a pushed tag.
