# Contributing

Thanks for your interest in Job Capture.

## Before you start

- Read [README.md](README.md), [SPEC.md](SPEC.md), and [DECISIONS.md](DECISIONS.md).
- Keep the project local-first, Excel-first, and intentionally small.
- Avoid expanding product scope without prior discussion.

## Good contributions

- bug fixes
- test coverage improvements
- extraction reliability fixes
- documentation improvements
- small maintainability improvements that do not change product scope

## Changes that need discussion first

- adding pages or workflows
- changing the storage backend
- changing the extraction strategy in a way that makes LLM use primary
- adding auth, analytics, syncing, notifications, or broader CRM features

## Local development

```powershell
npm install
npx playwright install chromium
npm run dev
```

## Verification

Run the relevant checks before opening a pull request:

```powershell
npm run lint
npm run format
npm test
npm run build
```

## Pull requests

- keep changes focused
- explain the problem and the fix
- include tests when practical
- update documentation when behavior or setup changes

See [.github/pull_request_template.md](.github/pull_request_template.md) for the default checklist.
