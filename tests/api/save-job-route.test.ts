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
  appendJob: vi.fn(),
}));

import { POST } from "@/app/api/save-job/route";
import { DuplicateJobUrlError, appendJob } from "@/lib/storage/jobs-repository";

function createSaveRequestBody(overrides: Record<string, string> = {}) {
  return {
    company: "Example Corp",
    createdAt: "2026-04-22T12:34",
    dateApplied: "2026-04-22",
    extractionStatus: "complete",
    jobId: "FE-123",
    jobUrl: "https://jobs.example.com/frontend-engineer",
    notes: "Saved from the Add Job form.",
    role: "Senior Frontend Engineer",
    source: "LinkedIn",
    visaSponsorship: "No",
    ...overrides,
  };
}

describe("POST /api/save-job", () => {
  it("returns a success response when the job is saved", async () => {
    vi.mocked(appendJob).mockResolvedValueOnce({
      job: {
        ...createSaveRequestBody(),
        id: "2",
      },
      warnings: [],
    });

    const response = await POST(
      new Request("http://localhost/api/save-job", {
        body: JSON.stringify(createSaveRequestBody()),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      job: {
        ...createSaveRequestBody(),
        id: "2",
      },
      message: "Job saved to Excel.",
      success: true,
      warnings: [],
    });
  });

  it("returns a duplicate-url block response", async () => {
    vi.mocked(appendJob).mockRejectedValueOnce(
      new DuplicateJobUrlError({
        ...createSaveRequestBody(),
        id: "2",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/save-job", {
        body: JSON.stringify(createSaveRequestBody()),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
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

  it("returns a success response with probable duplicate warnings", async () => {
    vi.mocked(appendJob).mockResolvedValueOnce({
      job: {
        ...createSaveRequestBody(),
        id: "3",
      },
      warnings: [
        "Possible duplicate found for the same Company, Role, and Job ID.",
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/save-job", {
        body: JSON.stringify(createSaveRequestBody()),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      job: {
        ...createSaveRequestBody(),
        id: "3",
      },
      message: "Job saved to Excel with a probable duplicate warning.",
      success: true,
      warnings: [
        "Possible duplicate found for the same Company, Role, and Job ID.",
      ],
    });
  });

  it("returns a validation response when the payload is invalid", async () => {
    const response = await POST(
      new Request("http://localhost/api/save-job", {
        body: JSON.stringify({
          ...createSaveRequestBody(),
          jobUrl: "not-a-url",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "validation_error",
        message: "The save request did not match the required job schema.",
      },
      success: false,
      warnings: [],
    });
  });
});
