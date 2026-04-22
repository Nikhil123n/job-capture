import { describe, expect, it } from "vitest";

import {
  findDuplicateUrlJob,
  findProbableDuplicateJob,
  getProbableDuplicateWarning,
  normalizeJobUrl,
} from "@/lib/storage/duplicate-check";
import type { SavedJob } from "@/lib/types/job";

function createSavedJob(overrides: Partial<SavedJob> = {}): SavedJob {
  return {
    id: "2",
    company: "Example Corp",
    role: "Senior Frontend Engineer",
    jobId: "FE-123",
    dateApplied: "2026-04-22",
    visaSponsorship: "No",
    source: "LinkedIn",
    notes: "Saved from a realistic fixture.",
    jobUrl: "https://jobs.example.com/roles/frontend-engineer",
    extractionStatus: "complete",
    createdAt: "2026-04-22T15:00:00.000Z",
    ...overrides,
  };
}

describe("duplicate-check helpers", () => {
  it("normalizes job URLs before duplicate comparison", () => {
    const duplicate = findDuplicateUrlJob(
      [createSavedJob()],
      "https://jobs.example.com/roles/frontend-engineer/#apply",
    );

    expect(
      normalizeJobUrl("https://Jobs.Example.com/roles/frontend-engineer/"),
    ).toBe("https://jobs.example.com/roles/frontend-engineer");
    expect(duplicate?.id).toBe("2");
  });

  it("finds a probable duplicate using company, role, and job id", () => {
    const probableDuplicate = findProbableDuplicateJob([createSavedJob()], {
      company: " example corp ",
      role: " senior frontend engineer ",
      jobId: " fe-123 ",
    });

    expect(probableDuplicate?.id).toBe("2");
    expect(
      getProbableDuplicateWarning({
        company: "Example Corp",
        role: "Senior Frontend Engineer",
        jobId: "FE-123",
      }),
    ).toBe("Possible duplicate found for the same Company, Role, and Job ID.");
  });

  it("falls back to company and role when the incoming job id is missing", () => {
    const probableDuplicate = findProbableDuplicateJob([createSavedJob()], {
      company: "Example Corp",
      role: "Senior Frontend Engineer",
      jobId: "",
    });

    expect(probableDuplicate?.id).toBe("2");
    expect(
      getProbableDuplicateWarning({
        company: "Example Corp",
        role: "Senior Frontend Engineer",
        jobId: "",
      }),
    ).toBe("Possible duplicate found for the same Company and Role.");
  });
});
