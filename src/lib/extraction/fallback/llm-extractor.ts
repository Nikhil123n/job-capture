import { load } from "cheerio";
import { z } from "zod";

import type { ExtractableJobFields } from "@/lib/types/job";

import type { LoadedPageMetadata } from "../page-loader";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const LLM_FALLBACK_TIMEOUT_MS = 15_000;
const MAX_VISIBLE_TEXT_LENGTH = 6_000;

const llmFallbackOutputSchema = z.object({
  company: z.string().trim().optional().default(""),
  jobId: z.string().trim().optional().default(""),
  role: z.string().trim().optional().default(""),
});

type LlmFallbackFields = Partial<
  Pick<ExtractableJobFields, "company" | "jobId" | "role">
>;

export type LlmFallbackInput = {
  html: string;
  metadata: LoadedPageMetadata;
  normalizedJobUrl: string;
  structuredData: Partial<ExtractableJobFields>;
  title: string;
};

export type LlmFallbackResult =
  | {
      fields: LlmFallbackFields;
      status: "success";
      warning: string;
    }
  | {
      status: "error" | "invalid" | "skipped" | "unavailable";
      warning: string;
    };

function getConfiguredModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

function getApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || "";
}

function normalizeFieldValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function compactWhitespace(value: string) {
  return value.split(/\s+/).filter(Boolean).join(" ");
}

function buildVisibleTextExcerpt(html: string) {
  const $ = load(html);

  $("script, style, noscript").remove();

  const text = compactWhitespace(
    $("main").text() || $("article").text() || $("body").text() || "",
  );

  return text.slice(0, MAX_VISIBLE_TEXT_LENGTH);
}

function buildMetadataSnapshot(metadata: LoadedPageMetadata) {
  return {
    applicationName: metadata.applicationName,
    canonicalUrl: metadata.canonicalUrl,
    company: metadata.metaByName["company"] ?? "",
    jobId:
      metadata.metaByName["job_id"] ??
      metadata.metaByName["jobid"] ??
      metadata.metaByName["linkedin:jobid"] ??
      metadata.metaByProperty["job:id"] ??
      metadata.metaByProperty["job:job_id"] ??
      "",
    openGraphSiteName: metadata.metaByProperty["og:site_name"] ?? "",
    openGraphTitle: metadata.metaByProperty["og:title"] ?? "",
    twitterTitle: metadata.metaByName["twitter:title"] ?? "",
  };
}

function buildPromptPayload(input: LlmFallbackInput) {
  return {
    metadata: buildMetadataSnapshot(input.metadata),
    normalizedJobUrl: input.normalizedJobUrl,
    structuredData: {
      company: input.structuredData.company ?? "",
      jobId: input.structuredData.jobId ?? "",
      jobUrl: input.structuredData.jobUrl ?? "",
      role: input.structuredData.role ?? "",
    },
    title: input.title,
    visibleTextExcerpt: buildVisibleTextExcerpt(input.html),
  };
}

function hasUsefulPromptPayload(
  promptPayload: ReturnType<typeof buildPromptPayload>,
) {
  return Boolean(
    promptPayload.title ||
    promptPayload.visibleTextExcerpt ||
    Object.values(promptPayload.metadata).some(Boolean) ||
    Object.values(promptPayload.structuredData).some(Boolean),
  );
}

function buildSystemPrompt() {
  return [
    "Extract job posting fields from the provided page evidence.",
    "Return JSON only.",
    "Use only the supplied evidence.",
    "Do not guess.",
    "If a field is not supported by the evidence, return an empty string for that field.",
    "Only extract company, role, and jobId.",
  ].join(" ");
}

function buildUserPrompt(promptPayload: ReturnType<typeof buildPromptPayload>) {
  return [
    "Extract the company, role, and jobId for a job posting.",
    "Return a JSON object with exactly these keys: company, role, jobId.",
    "Use empty strings when the evidence does not support a field.",
    "",
    JSON.stringify(promptPayload, null, 2),
  ].join("\n");
}

function getResponseOutputText(responseBody: unknown) {
  if (!responseBody || typeof responseBody !== "object") {
    return "";
  }

  const body = responseBody as {
    output?: Array<{
      content?: Array<{
        refusal?: string;
        text?: string;
        type?: string;
      }>;
    }>;
  };
  const textFragments: string[] = [];

  body.output?.forEach((item) => {
    item.content?.forEach((contentItem) => {
      if (contentItem.type === "output_text" && contentItem.text) {
        textFragments.push(contentItem.text);
      }
    });
  });

  return textFragments.join("").trim();
}

function hasRefusalOutput(responseBody: unknown) {
  if (!responseBody || typeof responseBody !== "object") {
    return false;
  }

  const body = responseBody as {
    output?: Array<{
      content?: Array<{
        refusal?: string;
      }>;
    }>;
  };

  return Boolean(
    body.output?.some((item) =>
      item.content?.some((contentItem) => Boolean(contentItem.refusal)),
    ),
  );
}

function parseFallbackFields(outputText: string) {
  let parsedOutput: unknown;

  try {
    parsedOutput = JSON.parse(outputText);
  } catch {
    return null;
  }

  const result = llmFallbackOutputSchema.safeParse(parsedOutput);

  if (!result.success) {
    return null;
  }

  return {
    company: normalizeFieldValue(result.data.company),
    jobId: normalizeFieldValue(result.data.jobId),
    role: normalizeFieldValue(result.data.role),
  };
}

export async function extractJobWithLlmFallback(
  input: LlmFallbackInput,
): Promise<LlmFallbackResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      status: "unavailable",
      warning:
        "LLM fallback was skipped because OPENAI_API_KEY is not configured.",
    };
  }

  const promptPayload = buildPromptPayload(input);

  if (!hasUsefulPromptPayload(promptPayload)) {
    return {
      status: "skipped",
      warning:
        "LLM fallback was skipped because the rendered page did not contain enough usable content.",
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      LLM_FALLBACK_TIMEOUT_MS,
    );
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: [
          {
            content: buildSystemPrompt(),
            role: "system",
          },
          {
            content: buildUserPrompt(promptPayload),
            role: "user",
          },
        ],
        model: getConfiguredModel(),
        text: {
          format: {
            name: "job_fallback_extraction",
            schema: {
              additionalProperties: false,
              properties: {
                company: {
                  type: "string",
                },
                jobId: {
                  type: "string",
                },
                role: {
                  type: "string",
                },
              },
              required: ["company", "role", "jobId"],
              type: "object",
            },
            strict: true,
            type: "json_schema",
          },
        },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    if (!response.ok) {
      return {
        status: "error",
        warning:
          "LLM fallback failed. Returning the deterministic extraction result.",
      };
    }

    const responseBody = (await response.json()) as unknown;

    if (hasRefusalOutput(responseBody)) {
      return {
        status: "invalid",
        warning:
          "LLM fallback returned unusable output. Returning the deterministic extraction result.",
      };
    }

    const outputText = getResponseOutputText(responseBody);
    const fallbackFields = parseFallbackFields(outputText);

    if (!fallbackFields) {
      return {
        status: "invalid",
        warning:
          "LLM fallback returned unusable output. Returning the deterministic extraction result.",
      };
    }

    if (
      !fallbackFields.company &&
      !fallbackFields.role &&
      !fallbackFields.jobId
    ) {
      return {
        status: "invalid",
        warning:
          "LLM fallback returned unusable output. Returning the deterministic extraction result.",
      };
    }

    return {
      fields: fallbackFields,
      status: "success",
      warning: "LLM fallback was used to supplement missing job details.",
    };
  } catch {
    return {
      status: "error",
      warning:
        "LLM fallback failed. Returning the deterministic extraction result.",
    };
  }
}
