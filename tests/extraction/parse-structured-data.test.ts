import { describe, expect, it } from "vitest";

import { parseStructuredData } from "@/lib/extraction/parse-structured-data";

describe("parseStructuredData", () => {
  it("extracts fields from JSON-LD JobPosting content", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Senior Frontend Engineer",
              "url": "https://jobs.example.com/frontend-engineer",
              "identifier": { "@type": "PropertyValue", "value": "FE-123" },
              "hiringOrganization": {
                "@type": "Organization",
                "name": "Example Corp"
              }
            }
          </script>
        </head>
      </html>
    `;

    expect(parseStructuredData(html)).toEqual({
      company: "Example Corp",
      jobId: "FE-123",
      jobUrl: "https://jobs.example.com/frontend-engineer",
      role: "Senior Frontend Engineer",
    });
  });
});
