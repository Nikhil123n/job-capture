import { afterEach, describe, expect, it, vi } from "vitest";

import { extractJob } from "@/lib/extraction/extract-job";
import { extractJobWithLlmFallback } from "@/lib/extraction/fallback/llm-extractor";
import { loadRenderedPage } from "@/lib/extraction/page-loader";

vi.mock("@/lib/extraction/page-loader", () => ({
  loadRenderedPage: vi.fn(),
}));

vi.mock("@/lib/extraction/fallback/llm-extractor", () => ({
  extractJobWithLlmFallback: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function createSuccessfulPage(
  overrides: Partial<Awaited<ReturnType<typeof loadRenderedPage>>> = {},
) {
  return {
    finalUrl: "https://jobs.example.com/frontend-engineer",
    html: `
      <html>
        <head>
          <title>Senior Frontend Engineer</title>
        </head>
        <body>
          <main>
            <h1>Senior Frontend Engineer</h1>
          </main>
        </body>
      </html>
    `,
    metadata: {
      applicationName: "",
      canonicalUrl: "https://jobs.example.com/frontend-engineer",
      metaByName: {},
      metaByProperty: {},
    },
    title: "Senior Frontend Engineer",
    type: "success" as const,
    ...overrides,
  };
}

describe("extractJob", () => {
  it("does not call the LLM fallback when deterministic extraction already has Company and Role", async () => {
    vi.mocked(loadRenderedPage).mockResolvedValueOnce(
      createSuccessfulPage({
        html: `
          <html>
            <head>
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "JobPosting",
                  "title": "Senior Frontend Engineer",
                  "hiringOrganization": {
                    "name": "Example Corp"
                  }
                }
              </script>
              <title>Senior Frontend Engineer at Example Corp</title>
            </head>
            <body>
              <main>
                <h1>Senior Frontend Engineer</h1>
              </main>
            </body>
          </html>
        `,
        title: "Senior Frontend Engineer at Example Corp",
      }),
    );

    await expect(
      extractJob({
        jobUrl: "https://jobs.example.com/frontend-engineer",
        source: "LinkedIn",
      }),
    ).resolves.toEqual({
      company: "Example Corp",
      extractionStatus: "complete",
      jobId: "",
      jobUrl: "https://jobs.example.com/frontend-engineer",
      normalizedJobUrl: "https://jobs.example.com/frontend-engineer",
      outcome: "success",
      role: "Senior Frontend Engineer",
      warnings: [],
    });
    expect(extractJobWithLlmFallback).not.toHaveBeenCalled();
  });

  it("calls the LLM fallback when a core field is missing and page content is available", async () => {
    vi.mocked(loadRenderedPage).mockResolvedValueOnce(createSuccessfulPage());
    vi.mocked(extractJobWithLlmFallback).mockResolvedValueOnce({
      fields: {
        company: "Example Corp",
        jobId: "FE-123",
        role: "Different Role",
      },
      status: "success",
      warning: "LLM fallback was used to supplement missing job details.",
    });

    await expect(
      extractJob({
        jobUrl: "https://jobs.example.com/frontend-engineer",
        source: "LinkedIn",
      }),
    ).resolves.toEqual({
      company: "Example Corp",
      extractionStatus: "complete",
      jobId: "FE-123",
      jobUrl: "https://jobs.example.com/frontend-engineer",
      normalizedJobUrl: "https://jobs.example.com/frontend-engineer",
      outcome: "success",
      role: "Senior Frontend Engineer",
      warnings: ["LLM fallback was used to supplement missing job details."],
    });
    expect(extractJobWithLlmFallback).toHaveBeenCalledTimes(1);
  });

  it("returns a deterministic partial result when fallback is unavailable", async () => {
    vi.mocked(loadRenderedPage).mockResolvedValueOnce(createSuccessfulPage());
    vi.mocked(extractJobWithLlmFallback).mockResolvedValueOnce({
      status: "unavailable",
      warning:
        "LLM fallback was skipped because OPENAI_API_KEY is not configured.",
    });

    await expect(
      extractJob({
        jobUrl: "https://jobs.example.com/frontend-engineer",
        source: "LinkedIn",
      }),
    ).resolves.toEqual({
      company: "",
      extractionStatus: "partial",
      jobId: "",
      jobUrl: "https://jobs.example.com/frontend-engineer",
      normalizedJobUrl: "https://jobs.example.com/frontend-engineer",
      outcome: "partial",
      role: "Senior Frontend Engineer",
      warnings: [
        "Extraction found partial job details. Review and complete the remaining fields manually.",
        "LLM fallback was skipped because OPENAI_API_KEY is not configured.",
      ],
    });
  });

  it("returns a deterministic partial result when fallback fails", async () => {
    vi.mocked(loadRenderedPage).mockResolvedValueOnce(createSuccessfulPage());
    vi.mocked(extractJobWithLlmFallback).mockResolvedValueOnce({
      status: "error",
      warning:
        "LLM fallback failed. Returning the deterministic extraction result.",
    });

    await expect(
      extractJob({
        jobUrl: "https://jobs.example.com/frontend-engineer",
        source: "LinkedIn",
      }),
    ).resolves.toEqual({
      company: "",
      extractionStatus: "partial",
      jobId: "",
      jobUrl: "https://jobs.example.com/frontend-engineer",
      normalizedJobUrl: "https://jobs.example.com/frontend-engineer",
      outcome: "partial",
      role: "Senior Frontend Engineer",
      warnings: [
        "Extraction found partial job details. Review and complete the remaining fields manually.",
        "LLM fallback failed. Returning the deterministic extraction result.",
      ],
    });
  });

  it("returns a deterministic partial result when fallback output is invalid", async () => {
    vi.mocked(loadRenderedPage).mockResolvedValueOnce(createSuccessfulPage());
    vi.mocked(extractJobWithLlmFallback).mockResolvedValueOnce({
      status: "invalid",
      warning:
        "LLM fallback returned unusable output. Returning the deterministic extraction result.",
    });

    await expect(
      extractJob({
        jobUrl: "https://jobs.example.com/frontend-engineer",
        source: "LinkedIn",
      }),
    ).resolves.toEqual({
      company: "",
      extractionStatus: "partial",
      jobId: "",
      jobUrl: "https://jobs.example.com/frontend-engineer",
      normalizedJobUrl: "https://jobs.example.com/frontend-engineer",
      outcome: "partial",
      role: "Senior Frontend Engineer",
      warnings: [
        "Extraction found partial job details. Review and complete the remaining fields manually.",
        "LLM fallback returned unusable output. Returning the deterministic extraction result.",
      ],
    });
  });

  it("returns a blocked result cleanly when the page loader is blocked", async () => {
    vi.mocked(loadRenderedPage).mockResolvedValueOnce({
      finalUrl: "https://jobs.example.com/frontend-engineer",
      message:
        "The job page appears to block automated access. Review and complete the fields manually.",
      type: "blocked",
    });

    await expect(
      extractJob({
        jobUrl: "https://jobs.example.com/frontend-engineer",
        source: "LinkedIn",
      }),
    ).resolves.toEqual({
      company: "",
      extractionStatus: "manual_only",
      jobId: "",
      jobUrl: "https://jobs.example.com/frontend-engineer",
      normalizedJobUrl: "https://jobs.example.com/frontend-engineer",
      outcome: "blocked",
      role: "",
      warnings: [
        "The job page appears to block automated access. Review and complete the fields manually.",
      ],
    });
    expect(extractJobWithLlmFallback).not.toHaveBeenCalled();
  });

  it("returns an error result cleanly when the page loader fails", async () => {
    vi.mocked(loadRenderedPage).mockResolvedValueOnce({
      finalUrl: "https://jobs.example.com/frontend-engineer",
      message:
        "The job page could not be loaded for extraction. Review and complete the fields manually.",
      type: "error",
    });

    await expect(
      extractJob({
        jobUrl: "https://jobs.example.com/frontend-engineer",
        source: "LinkedIn",
      }),
    ).resolves.toEqual({
      company: "",
      extractionStatus: "manual_only",
      jobId: "",
      jobUrl: "https://jobs.example.com/frontend-engineer",
      normalizedJobUrl: "https://jobs.example.com/frontend-engineer",
      outcome: "error",
      role: "",
      warnings: [
        "The job page could not be loaded for extraction. Review and complete the fields manually.",
      ],
    });
    expect(extractJobWithLlmFallback).not.toHaveBeenCalled();
  });
});
