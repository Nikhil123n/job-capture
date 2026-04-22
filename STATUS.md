# Release Status

## Current state

Job Capture v1 is implemented, verified, and prepared for public open-source release.

## Release summary

- local-first job application tracker
- Excel-backed storage at `data/jobs.xlsx`
- deterministic extraction first
- optional env-gated LLM fallback
- Add Job and Jobs Applied flows fully implemented

## Verification snapshot

The repository has been verified with:

- `npm run lint`
- `npm run format`
- `npm test`
- `npm run build`

## Operational notes

- Playwright Chromium is required for rendered extraction.
- The app remains usable without LLM configuration.
- `OPENAI_API_KEY` and `OPENAI_MODEL` only affect the optional fallback path.
- Workbook bootstrap creates `data/jobs.xlsx` automatically on first use.

## Current blockers

- None

## Maintenance guidance

- Treat `SPEC.md` and `DECISIONS.md` as the product guardrails.
- Keep the scope local-first and Excel-first unless maintainers intentionally expand it.
- Prefer bug fixes, reliability improvements, tests, and documentation over feature growth.
