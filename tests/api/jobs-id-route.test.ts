import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/jobs-repository", () => ({
  DuplicateJobUrlError: class DuplicateJobUrlError extends Error {
    existingJob;

    constructor(existingJob: {
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
    }) {
      super("A job with the same URL already exists.");
      this.existingJob = existingJob;
      this.name = "DuplicateJobUrlError";
    }
  },
  JobRowNotFoundError: class JobRowNotFoundError extends Error {
    constructor(id: string) {
      super(`Job row not found: ${id}`);
      this.name = "JobRowNotFoundError";
    }
  },
  updateJob: vi.fn(),
}));

import { PUT } from "@/app/api/jobs/[id]/route";
import { DuplicateJobUrlError, updateJob } from "@/lib/storage/jobs-repository";

function createUpdateRequestBody(overrides: Record<string, string> = {}) {
  return {
    company: "Example Corp",
    dateApplied: "2026-04-22",
    extractionStatus: "complete",
    jobId: "FE-123",
    jobUrl: "https://jobs.example.com/frontend-engineer",
    notes: "Updated from the Jobs Applied page.",
    role: "Senior Frontend Engineer",
    source: "LinkedIn",
    visaSponsorship: "No",
    ...overrides,
  };
}

function createSavedJob(overrides: Record<string, string> = {}) {
  return {
    ...createUpdateRequestBody(overrides),
    createdAt: "2026-04-22T12:34",
    id: "2",
  };
}

describe("PUT /api/jobs/:id", () => {
  it("returns a success response when the job is updated", async () => {
    vi.mocked(updateJob).mockResolvedValueOnce({
      job: createSavedJob({
        notes: "Corrected note.",
      }),
      warnings: [],
    });

    const response = await PUT(
      new Request("http://localhost/api/jobs/2", {
        body: JSON.stringify(createUpdateRequestBody()),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
      }),
      {
        params: Promise.resolve({
          id: "2",
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      job: createSavedJob({
        notes: "Corrected note.",
      }),
      message: "Job updated in Excel.",
      success: true,
      warnings: [],
    });
  });

  it("returns a duplicate-url block response", async () => {
    vi.mocked(updateJob).mockRejectedValueOnce(
      new DuplicateJobUrlError(createSavedJob()),
    );

    const response = await PUT(
      new Request("http://localhost/api/jobs/2", {
        body: JSON.stringify(createUpdateRequestBody()),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
      }),
      {
        params: Promise.resolve({
          id: "2",
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: {
        code: "duplicate_url",
        message: "A job with the same URL already exists.",
      },
      success: false,
      warnings: [],
    });
  });

  it("returns a validation response when the payload is invalid", async () => {
    const response = await PUT(
      new Request("http://localhost/api/jobs/2", {
        body: JSON.stringify({
          ...createUpdateRequestBody(),
          jobUrl: "not-a-url",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
      }),
      {
        params: Promise.resolve({
          id: "2",
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "validation_error",
        message: "The update request did not match the required job schema.",
      },
      success: false,
      warnings: [],
    });
  });
});
