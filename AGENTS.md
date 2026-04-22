# AGENTS.md

## Purpose

This file is for coding assistants and other automation working in the repository.

Job Capture is already implemented as a narrow v1. Contributions should preserve the shipped product shape unless maintainers explicitly decide to expand scope.

## Read order

Before making changes, read:

1. `README.md`
2. `docs/SPEC.md`
3. `docs/DECISIONS.md`
4. `docs/PROJECT_STRUCTURE.md`
5. `docs/TASKS.md`
6. `docs/STATUS.md`

## Operating rules

1. Keep the app simple and local-first.
2. Preserve exactly two user-facing pages unless maintainers approve a broader release.
3. Keep Excel as the current storage backend.
4. Keep deterministic extraction as the primary path.
5. Keep LLM fallback optional and env-gated.
6. Do not make regex the primary extraction strategy.
7. Do not add deceptive anti-bot evasion, proxy rotation, or fake browser identity systems.
8. Keep extracted fields editable before save.
9. Prefer small, focused changes over speculative refactors.
10. Do not change product scope silently.

## Implementation style

- Prefer plain functions and explicit modules.
- Keep dependencies minimal.
- Avoid generic plugin systems and scalability-driven abstractions that are not needed now.
- Keep responsibilities separated across UI, API routes, extraction, storage, shared types, and tests.

## File discipline

- Do not edit unrelated files.
- Do not rename files without a concrete reason.
- Split files when they become mixed-purpose or hard to review.
- Keep workbook access in `src/lib/storage/*`.
- Keep extraction orchestration in `src/lib/extraction/*`.

## Bug-fix protocol

For each bug:

1. reproduce it
2. identify the root cause briefly
3. fix the smallest correct unit
4. add or update a regression test when practical
5. rerun the relevant checks
6. update docs if the behavior or operator guidance changed

## Verification expectations

- Do not claim success without verification.
- Prefer deterministic fixtures over live-site tests.
- Run the relevant repo checks for the change:
  `npm run lint`, `npm run format`, `npm test`, and `npm run build` when appropriate.

## Decision priority

If documents disagree, follow this order:

1. `docs/SPEC.md`
2. `docs/DECISIONS.md`
3. `docs/PROJECT_STRUCTURE.md`
4. `README.md`
5. local implementation convenience
