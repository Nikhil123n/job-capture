import { describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/jobs/route";

vi.mock("@/lib/storage/jobs-repository", () => ({
  readAllJobs: vi.fn(),
}));

import { readAllJobs } from "@/lib/storage/jobs-repository";

function createSavedJob(
  overrides: Partial<{
    company: string;
    createdAt: string;
    dateApplied: string;
    extractionStatus: "complete" | "manual_only" | "partial";
    id: string;
    jobId: string;
    jobUrl: string;
    notes: string;
    role: string;
    source:
      | "Dice"
      | "Glassdoor"
      | "JobRight"
      | "LinkedIn"
      | "Other"
      | "Simplify";
    visaSponsorship: string;
  }> = {},
) {
  return {
    company: "Example Corp",
    createdAt: "2026-04-22T12:34",
    dateApplied: "2026-04-22",
    extractionStatus: "complete" as const,
    id: "2",
    jobId: "FE-123",
    jobUrl: "https://jobs.example.com/frontend-engineer",
    notes: "Saved from the Add Job form.",
    role: "Senior Frontend Engineer",
    source: "LinkedIn" as const,
    visaSponsorship: "No",
    ...overrides,
  };
}

describe("GET /api/jobs", () => {
  it("returns saved jobs sorted by newest date applied first by default", async () => {
    vi.mocked(readAllJobs).mockResolvedValueOnce([
      createSavedJob({ dateApplied: "2026-04-20", id: "2" }),
      createSavedJob({
        company: "Second Corp",
        dateApplied: "2026-04-22",
        id: "3",
        role: "Product Designer",
      }),
    ]);

    const response = await GET(new Request("http://localhost/api/jobs"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobs.map((job: { id: string }) => job.id)).toEqual(["3", "2"]);
  });

  it("returns an empty jobs array when no saved jobs exist", async () => {
    vi.mocked(readAllJobs).mockResolvedValueOnce([]);

    const response = await GET(new Request("http://localhost/api/jobs"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ jobs: [] });
  });
});
