# Locked v1 Decisions

These decisions define the current public release.

1. Job Capture is a simple personal tracker, not a recruiting platform.
2. The UI has exactly two pages: `Add Job` and `Jobs Applied`.
3. Storage is Excel-first through `data/jobs.xlsx`.
4. The app is local-first and Windows-first, with no hosting requirement baked into v1.
5. The user manually controls Source, Visa Sponsorship, and Notes.
6. Extracted fields remain editable before save.
7. Duplicate Job URLs are blocked.
8. Probable duplicates warn on Company + Role + Job ID, with Company + Role fallback when Job ID is missing.
9. Deterministic extraction runs first.
10. LLM fallback is optional, secondary, and only used when deterministic extraction is insufficient.
11. Regex is not the primary extraction strategy.
12. The Jobs Applied page supports search, source filtering, date sorting, clickable Role links, and inline row edits.
13. `Date Applied` is date-only.
14. `Created At` is a timestamp.
15. `Source` is a locked dropdown including `Other`.
16. `Notes` is multiline plain text.
17. There is no auth in the shipped local-first release.
18. There is no job-status pipeline in the shipped release.
19. Extraction must fail gracefully and preserve manual correction paths.
20. Reliability, correctness, maintainability, and low complexity take priority over feature breadth.
