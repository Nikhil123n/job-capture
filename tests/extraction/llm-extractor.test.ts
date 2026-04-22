import { afterEach, describe, expect, it, vi } from "vitest";

import { extractJobWithLlmFallback } from "@/lib/extraction/fallback/llm-extractor";

const fetchMock = vi.fn();

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function createFallbackInput(
  overrides: Partial<Parameters<typeof extractJobWithLlmFallback>[0]> = {},
) {
  return {
    html: `
      <html>
        <body>
          <main>
            <h1>Senior Frontend Engineer</h1>
            <p>Join Example Corp to build frontend systems.</p>
          </main>
        </body>
      </html>
    `,
    metadata: {
      applicationName: "Example Careers",
      canonicalUrl: "https://jobs.example.com/frontend-engineer",
      metaByName: {
        company: "Example Corp",
      },
      metaByProperty: {
        "og:title": "Senior Frontend Engineer",
      },
    },
    normalizedJobUrl: "https://jobs.example.com/frontend-engineer",
    structuredData: {
      company: "",
      jobId: "",
      jobUrl: "",
      role: "",
    },
    title: "Senior Frontend Engineer",
    ...overrides,
  };
}

describe("extractJobWithLlmFallback", () => {
  it("skips fallback when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      extractJobWithLlmFallback(createFallbackInput()),
    ).resolves.toEqual({
      status: "unavailable",
      warning:
        "LLM fallback was skipped because OPENAI_API_KEY is not configured.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns parsed fallback fields when the LLM returns valid structured output", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "gpt-4o-mini");
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          output: [
            {
              content: [
                {
                  text: JSON.stringify({
                    company: " Example Corp ",
                    jobId: " FE-123 ",
                    role: " Senior Frontend Engineer ",
                  }),
                  type: "output_text",
                },
              ],
            },
          ],
        }),
        ok: true,
      }),
    );

    await expect(
      extractJobWithLlmFallback(createFallbackInput()),
    ).resolves.toEqual({
      fields: {
        company: "Example Corp",
        jobId: "FE-123",
        role: "Senior Frontend Engineer",
      },
      status: "success",
      warning: "LLM fallback was used to supplement missing job details.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles invalid JSON output safely", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          output: [
            {
              content: [
                {
                  text: "not-json",
                  type: "output_text",
                },
              ],
            },
          ],
        }),
        ok: true,
      }),
    );

    await expect(
      extractJobWithLlmFallback(createFallbackInput()),
    ).resolves.toEqual({
      status: "invalid",
      warning:
        "LLM fallback returned unusable output. Returning the deterministic extraction result.",
    });
  });

  it("handles refusal-like output safely", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          output: [
            {
              content: [
                {
                  refusal: "I can't help with that.",
                  type: "refusal",
                },
              ],
            },
          ],
        }),
        ok: true,
      }),
    );

    await expect(
      extractJobWithLlmFallback(createFallbackInput()),
    ).resolves.toEqual({
      status: "invalid",
      warning:
        "LLM fallback returned unusable output. Returning the deterministic extraction result.",
    });
  });
});
