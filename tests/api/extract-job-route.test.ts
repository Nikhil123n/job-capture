import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/extraction/extract-job", () => ({
  extractJob: vi.fn(),
}));

import { POST } from "@/app/api/extract-job/route";
import { extractJob } from "@/lib/extraction/extract-job";

describe("POST /api/extract-job", () => {
  it("returns the extraction result from the existing endpoint contract", async () => {
    vi.mocked(extractJob).mockResolvedValueOnce({
      company: "Example Corp",
      extractionStatus: "complete",
      jobId: "FE-123",
      jobUrl: "https://jobs.example.com/frontend-engineer",
      normalizedJobUrl: "https://jobs.example.com/frontend-engineer",
      outcome: "success",
      role: "Senior Frontend Engineer",
      warnings: ["LLM fallback was used to supplement missing job details."],
    });

    const response = await POST(
      new Request("http://localhost/api/extract-job", {
        body: JSON.stringify({
          jobUrl: "https://jobs.example.com/frontend-engineer",
          source: "LinkedIn",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      company: "Example Corp",
      extractionStatus: "complete",
      jobId: "FE-123",
      jobUrl: "https://jobs.example.com/frontend-engineer",
      normalizedJobUrl: "https://jobs.example.com/frontend-engineer",
      outcome: "success",
      role: "Senior Frontend Engineer",
      warnings: ["LLM fallback was used to supplement missing job details."],
    });
  });

  it("returns a validation error shape for invalid extraction requests", async () => {
    const response = await POST(
      new Request("http://localhost/api/extract-job", {
        body: JSON.stringify({
          jobUrl: "not-a-url",
          source: "LinkedIn",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "validation_error",
        message: "Invalid extraction request.",
      },
      warnings: [],
    });
  });
});
