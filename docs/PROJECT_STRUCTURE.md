# Project Structure

This document describes the shipped repository layout and the boundaries that keep Job Capture simple to maintain.

## Repository goals

The current structure is optimized for:

- one Next.js app
- exactly two user-facing pages
- a thin in-app backend surface
- Excel-first local storage
- deterministic extraction first
- an optional, isolated LLM fallback

## Current stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- TanStack Table
- Playwright
- Cheerio
- ExcelJS
- date-fns
- Vitest
- Testing Library

## Current repository layout

```text
job-capture/
  .github/
  data/
    .gitkeep
  docs/
    archive/
  public/
  src/
    app/
      add-job/
      api/
        extract-job/
        jobs/
          [id]/
        save-job/
      jobs/
      favicon.ico
      globals.css
      layout.tsx
      page.tsx
    components/
      add-job/
      jobs/
      shared/
    lib/
      config/
      extraction/
        fallback/
      storage/
      types/
      validation/
  tests/
    api/
    app/
    extraction/
    storage/
  AGENTS.md
  docs/
    CHANGELOG.md
    CODE_OF_CONDUCT.md
    CONTRIBUTING.md
    DECISIONS.md
    PROJECT_STRUCTURE.md
    SECURITY.md
    SPEC.md
    STATUS.md
    TASKS.md
    archive/
  LICENSE
  README.md
```

## Boundary summary

### `src/app/*`

Route-level page containers and API handlers only.

- `src/app/add-job/page.tsx`: Add Job page shell
- `src/app/jobs/page.tsx`: Jobs Applied page shell
- `src/app/api/extract-job/route.ts`: extraction endpoint
- `src/app/api/save-job/route.ts`: create-job endpoint
- `src/app/api/jobs/route.ts`: jobs listing endpoint
- `src/app/api/jobs/[id]/route.ts`: update-job endpoint

These files should stay thin and delegate logic to `src/lib/*`.

### `src/components/add-job/*`

UI for the Add Job flow.

- form state
- validation display
- extraction feedback
- save feedback

No workbook access and no extraction parsing logic should live here.

### `src/components/jobs/*`

UI for the Jobs Applied page.

- search, source filter, and date-sort controls
- table rendering
- inline single-row edit mode

No workbook access should live here.

### `src/components/shared/*`

Shared presentational pieces such as page headers and empty states.

### `src/lib/config/*`

Centralized configuration such as locked source dropdown values.

### `src/lib/types/*`

Shared domain and API contract types.

### `src/lib/validation/*`

Zod schemas and form/request validation helpers.

### `src/lib/storage/*`

The only place that reads or writes the Excel workbook.

- workbook bootstrap
- stable schema and column mapping
- duplicate checks
- repository read, append, and update operations

### `src/lib/extraction/*`

The only place that coordinates extraction:

- rendered page loading
- structured data parsing
- metadata parsing
- semantic DOM fallback
- LLM fallback orchestration

### `src/lib/extraction/fallback/*`

The optional LLM integration is isolated here and must remain easy to disable.

## Local data

The workbook lives at:

```text
data/jobs.xlsx
```

Rules:

- the workbook is created automatically if it does not exist
- the header order matches the locked schema in `docs/SPEC.md`
- blank spreadsheet values are normalized as empty strings, not `null`
- duplicate Job URL protection is enforced before writes

## Tests

The test suite is split by responsibility:

- `tests/api/*`: route handler coverage
- `tests/app/*`: component and page behavior
- `tests/extraction/*`: deterministic extraction and fallback behavior
- `tests/storage/*`: workbook and duplicate logic

## Archived build prompts

The original Codex milestone prompts are preserved as historical artifacts under `docs/archive/`.
