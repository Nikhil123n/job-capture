# Job Capture

Job Capture is a local-first job application tracker that stores applications in an Excel workbook and helps prefill job details from public job pages.

## What the app does

Job Capture is built for personal use, not team recruiting workflows. It gives you a simple Add Job flow and a Jobs Applied page for browsing and correcting saved records.

Today the app can:

- capture a job URL and manual fields such as Source, Visa Sponsorship, and Notes
- extract Company, Role, Job ID, normalized Job URL, and Extraction Status when possible
- keep every extracted field editable before save
- save records to a local Excel workbook at `data/jobs.xlsx`
- block duplicate Job URLs and warn on likely duplicates from Company + Role + Job ID
- browse saved jobs with search, source filtering, date sorting, and inline row edits

## Key features

- Local-first Excel storage with no database required
- Exactly two pages: `Add Job` and `Jobs Applied`
- Deterministic extraction first: final rendered page content, JSON-LD, metadata, and semantic DOM parsing
- Optional LLM fallback only when deterministic extraction is still missing Company or Role
- Clear blocked, partial, and manual-correction paths instead of silent guesses
- Simple backend surface with Next.js route handlers and focused test coverage

## Screenshots / Demo

No screenshots or demo assets are checked in yet.

If you want to add them later, a good convention is to place images under `docs/assets/` and update this section with:

- an Add Job page screenshot
- a Jobs Applied page screenshot
- a short GIF of extraction, save, and row edit flows

## Tech stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- React Hook Form + Zod
- TanStack Table
- ExcelJS
- Playwright
- Cheerio
- Vitest + Testing Library

## Prerequisites

- Node.js 20 or newer
- npm
- Playwright Chromium for rendered extraction

The project is Windows-first because that is the original target workflow, but it should also run anywhere the listed Node.js and Playwright dependencies are supported.

## Local setup

1. Clone the repository.
2. Install dependencies:

   ```powershell
   npm install
   ```

3. Install Playwright Chromium:

   ```powershell
   npx playwright install chromium
   ```

4. Optional: copy the example environment file if you want LLM fallback enabled:

   ```powershell
   Copy-Item .env.example .env.local
   ```

5. Start the development server:

   ```powershell
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Playwright setup

Rendered extraction depends on Playwright Chromium. If Chromium is not installed locally:

- the app still starts
- manual entry still works
- extraction returns a clear failure path instead of crashing

The setup command is:

```powershell
npx playwright install chromium
```

## Environment variables

Job Capture works without any environment variables for deterministic extraction and manual entry. The only optional configuration is for LLM fallback.

| Variable         | Required | Purpose                                                                                 |
| ---------------- | -------- | --------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY` | No       | Enables the optional fallback model path when deterministic extraction is incomplete.   |
| `OPENAI_MODEL`   | No       | Overrides the default fallback model. Use a model that supports structured JSON output. |

See [.env.example](.env.example) for the supported shape.

## How data is stored locally

- The source of truth is the Excel workbook at `data/jobs.xlsx`.
- The workbook is created automatically on first use.
- Each saved job is stored with the locked v1 schema:
  Company, Role, Job ID, Date Applied, Visa Sponsorship, Source, Notes, Job URL, Extraction Status, and Created At.
- `data/jobs.xlsx` is intentionally ignored by Git so local application history does not leak into the repository.

## Extraction approach

Extraction is intentionally conservative.

Deterministic extraction runs first in this order:

1. final rendered page content
2. JSON-LD / structured job data
3. stable metadata
4. semantic DOM text and selectors

If the page loads successfully but Company or Role is still missing, an optional env-gated LLM fallback may try to fill only the missing extraction-managed fields. Deterministic values always win. The app does not use the LLM on every extraction.

## Limitations and non-goals

- Excel is the only storage backend in the current release.
- The app is local-first. It does not include auth, syncing, or multi-user workflows.
- Some job pages will still require manual correction, especially when the page is blocked, thin on structured data, or highly customized.
- The app does not implement deceptive anti-bot evasion, proxy rotation, or fake browser identity systems.
- The app does not track interview stages, pipelines, or broader recruiting CRM workflows.
- The app does not support Google Sheets or SQLite in the current release.

## Test, lint, and build commands

```powershell
npm run lint
npm run format
npm test
npm run build
```

Notes:

- `npm run lint` uses `eslint .`
- `npm run format` uses `prettier --check .`
- `npm test` runs the Vitest suite

## Project structure overview

The repository stays intentionally small:

```text
src/
  app/
    add-job/
    jobs/
    api/
  components/
    add-job/
    jobs/
    shared/
  lib/
    config/
    extraction/
    storage/
    types/
    validation/
tests/
data/
```

For a more detailed breakdown, see [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

## Contributing

Contributions are welcome, especially for bug fixes, tests, documentation, and extraction reliability improvements that stay within the current product scope.

Read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) before opening a pull request.

## Security

If you discover a security issue, please follow [docs/SECURITY.md](docs/SECURITY.md) instead of opening a public bug report.

## License

This project is released under the [MIT License](LICENSE).
