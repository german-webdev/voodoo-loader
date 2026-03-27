# Branch Protection and Required Checks

This repository uses a QA gate on every feature branch and pull request.

## Local guardrail (before push)

1. Configure hooks path once:

```bash
./scripts/install_git_hooks.sh
```

or

```powershell
scripts\install_git_hooks.ps1
```

2. The `pre-push` hook runs `scripts/qa_gate.sh` and blocks push on failure.

## GitHub guardrail (before merge)

Configure branch protection for `master` in repository settings:

1. Settings -> Branches -> Add branch protection rule.
2. Branch name pattern: `master`.
3. Enable `Require a pull request before merging`.
4. Enable `Require status checks to pass before merging`.
5. Add required check: `QA Gate / qa`.
6. Optional but recommended: `Require branches to be up to date before merging`.
7. Optional but recommended: restrict who can push to `master`.

## Expected workflow

1. Create feature branch: `dev/<type>/<short-name>`.
2. Implement changes.
3. Local push is blocked until QA gate is green.
4. Open PR.
5. Merge only after `QA Gate / qa` is green in GitHub.
