import { describe, expect, it } from "vitest";

import { parseMetadata } from "@/lib/extraction/parse-metadata";

describe("parseMetadata", () => {
  it("extracts job details from stable metadata", () => {
    expect(
      parseMetadata(
        "Senior Frontend Engineer | Example Corp",
        {
          applicationName: "",
          canonicalUrl: "https://jobs.example.com/frontend-engineer",
          metaByName: {
            job_id: "FE-123",
            "twitter:title": "Senior Frontend Engineer | Example Corp",
          },
          metaByProperty: {
            "og:site_name": "Example Corp",
            "og:title": "Senior Frontend Engineer | Example Corp",
          },
        },
        "https://jobs.example.com/frontend-engineer?ref=board",
      ),
    ).toEqual({
      company: "Example Corp",
      jobId: "FE-123",
      jobUrl: "https://jobs.example.com/frontend-engineer",
      role: "Senior Frontend Engineer",
    });
  });
});
