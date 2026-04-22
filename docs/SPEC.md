# Job Capture Specification

## Product summary

Job Capture is a simple, reliable, local-first web app for personally tracking submitted job applications with minimal manual input.

The app is intentionally narrow:

- personal use
- exactly two pages
- Excel-first storage
- deterministic extraction first
- optional LLM fallback only when deterministic extraction is incomplete

It is not a recruiting CRM.

## Scope

The current release includes exactly two user-facing pages:

1. `Add Job`
2. `Jobs Applied`

## Add Job flow

The Add Job page supports:

- entering a Job URL
- selecting Source
- manually entering Visa Sponsorship
- manually entering Notes
- running extraction
- reviewing editable extracted fields
- saving the current form state

Editable extracted fields include:

- Company
- Role
- Job ID
- Date Applied
- Created At
- Extraction Status

## Jobs Applied flow

The Jobs Applied page supports:

- loading saved rows from the Excel-backed API
- search
- source filtering
- sorting by Date Applied
- clicking Role to open the original Job URL
- inline single-row editing of the editable fields

`Created At` remains read-only during edits.

## Storage model

The source of truth is the local workbook:

```text
data/jobs.xlsx
```

The locked worksheet columns are:

1. Company
2. Role
3. Job ID
4. Date Applied
5. Visa Sponsorship
6. Source
7. Notes
8. Job URL
9. Extraction Status
10. Created At

Rules:

- `Date Applied` is date-only
- `Created At` is a timestamp
- `Source` is a dropdown plus `Other`
- `Notes` is multiline plain text
- spreadsheet values are normalized as trimmed strings

## Manual fields

The user always manually controls:

- Source
- Visa Sponsorship
- Notes

Extracted values always remain editable before save.

## Duplicate behavior

Hard block:

- duplicate Job URL

Soft warning:

- same Company + Role + Job ID
- fallback warning on Company + Role when Job ID is empty

## Extraction behavior

Deterministic extraction runs first and remains the primary path.

Current deterministic order:

1. final rendered page content
2. JSON-LD / structured job data
3. stable metadata
4. semantic DOM parsing

Optional LLM fallback:

- runs only after a successful page load
- runs only when Company or Role is still missing
- fills only missing extraction-managed fields
- never overwrites non-empty deterministic values
- is disabled unless environment configuration is present

## Extraction constraints

- no regex-first extraction design
- no deceptive anti-bot evasion
- no proxy rotation to bypass access controls
- blocked, partial, and failed extraction outcomes must preserve the manual workflow

If extraction is partial:

- return what is known
- mark `Extraction Status` as `partial`
- surface warnings clearly
- allow save

If extraction fails:

- preserve manual entry
- mark `Extraction Status` as `manual_only`
- allow save

## API surface

### `POST /api/extract-job`

Input:

- `jobUrl`
- `source`

Output includes:

- `company`
- `role`
- `jobId`
- `jobUrl`
- `normalizedJobUrl`
- `extractionStatus`
- `outcome`
- `warnings`

### `POST /api/save-job`

Saves the current Add Job form state after validation and duplicate checks.

### `GET /api/jobs`

Returns saved jobs with query support for:

- search
- source filter
- date sort

### `PUT /api/jobs/:id`

Updates an existing saved row while preserving the workbook schema.

## Validation rules

Required to save:

- Job URL
- Source
- Date Applied
- Company or Role

All extracted fields remain editable before save.

## Non-goals

The current release does not include:

- auth
- multi-user workflows
- job status pipelines
- dashboards or analytics
- notifications
- Google Sheets
- SQLite or another database backend
- browser extension support

## Acceptance summary

The release is correct when it allows a user to:

1. add a job manually
2. extract job details when available
3. edit extracted fields before save
4. save to Excel
5. hit duplicate URL blocking
6. receive probable duplicate warnings without losing the save path
7. browse all saved jobs
8. search, filter, and sort on the Jobs Applied page
9. open the original job link from the Role field
10. continue with manual entry when extraction is partial or fails
