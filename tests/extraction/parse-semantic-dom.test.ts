import { describe, expect, it } from "vitest";

import { parseSemanticDom } from "@/lib/extraction/parse-semantic-dom";

describe("parseSemanticDom", () => {
  it("extracts job details from semantic DOM content", () => {
    const html = `
      <html>
        <body>
          <main>
            <h1>Senior Frontend Engineer</h1>
            <dl>
              <dt>Company</dt>
              <dd>Example Corp</dd>
              <dt>Job ID</dt>
              <dd>FE-123</dd>
            </dl>
          </main>
        </body>
      </html>
    `;

    expect(parseSemanticDom(html)).toEqual({
      company: "Example Corp",
      jobId: "FE-123",
      role: "Senior Frontend Engineer",
    });
  });
});
