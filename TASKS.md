# Implementation Checklist

This file is preserved as a historical record of the work that shipped v1 and the repository publication pass.

## Application delivery

### Milestone 1 - Project skeleton

Status: done

- [x] Initialize frontend and backend structure
- [x] Add shared types and config constants
- [x] Add linting, formatting, and test setup
- [x] Add baseline local run documentation

### Milestone 2 - Excel storage layer

Status: done

- [x] Create workbook bootstrap logic
- [x] Create read-all jobs function
- [x] Create append job function
- [x] Create update job function
- [x] Enforce schema column order
- [x] Add duplicate URL detection
- [x] Add storage tests

### Milestone 3 - Add Job page UI

Status: done

- [x] Build form layout
- [x] Add URL input
- [x] Add Source dropdown
- [x] Add Visa Sponsorship input
- [x] Add Notes textarea
- [x] Add editable extracted fields
- [x] Add Extract, Save, Reset buttons
- [x] Add client-side validation display

### Milestone 4 - Extraction pipeline

Status: done

- [x] Create extract-job endpoint
- [x] Add Playwright page retrieval
- [x] Parse JSON-LD job data when available
- [x] Parse metadata and semantic DOM fallback
- [x] Normalize extracted values
- [x] Set extraction status complete, partial, or manual-only
- [x] Add extraction tests

### Milestone 5 - Save flow

Status: done

- [x] Connect Add Job page to the save API
- [x] Block duplicate URL saves
- [x] Warn on probable duplicates
- [x] Allow save on partial extraction
- [x] Add integration tests for the Add Job flow

### Milestone 6 - Jobs Applied page

Status: done

- [x] Build jobs table
- [x] Add search
- [x] Add source filter
- [x] Add date sorting
- [x] Make Role clickable to the original URL
- [x] Add row edit behavior
- [x] Add integration tests for the Jobs Applied page

### Milestone 7 - LLM fallback

Status: done

- [x] Define strict fallback trigger rules
- [x] Add structured fallback extraction interface
- [x] Merge fallback output safely with deterministic output
- [x] Mark records appropriately when fallback is used
- [x] Add fallback tests using mocked responses

### Milestone 8 - Hardening

Status: done

- [x] Add friendly error states and clearer UI messages
- [x] Tighten malformed response handling
- [x] Simplify fragile code paths where needed
- [x] Final acceptance check against `SPEC.md`

## Repository publication

### Open-source release prep

Status: done

- [x] Rewrite root documentation for public readers
- [x] Archive implementation-era prompt files
- [x] Add MIT license
- [x] Add contribution, code of conduct, security, and changelog files
- [x] Add issue templates and pull request template
- [x] Add a minimal CI workflow
- [x] Tighten ignore and editor settings for public use
