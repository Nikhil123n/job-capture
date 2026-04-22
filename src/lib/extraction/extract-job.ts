import type {
  ExtractJobRequest,
  ExtractJobResult,
  ExtractableJobFields,
} from "@/lib/types/job";

import { extractJobWithLlmFallback } from "./fallback/llm-extractor";
import { loadRenderedPage } from "./page-loader";
import { parseMetadata } from "./parse-metadata";
import { parseSemanticDom } from "./parse-semantic-dom";
import { parseStructuredData } from "./parse-structured-data";

function normalizeTextValue(value: string) {
  return value.trim();
}

function trimTrailingSlashes(pathname: string) {
  let normalizedPath = pathname;

  while (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  return normalizedPath;
}

function normalizeJobUrl(jobUrl: string) {
  const trimmedUrl = jobUrl.trim();

  if (!trimmedUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedUrl);

    parsedUrl.hash = "";
    parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
    parsedUrl.pathname = trimTrailingSlashes(parsedUrl.pathname || "/");

    return parsedUrl.toString();
  } catch {
    return trimmedUrl;
  }
}

function mergeExtractedFields(
  ...candidates: Array<Partial<ExtractableJobFields>>
): ExtractableJobFields {
  return {
    company: "",
    jobId: "",
    jobUrl: "",
    role: "",
    ...Object.fromEntries(
      (["company", "jobId", "jobUrl", "role"] as const).map((field) => {
        const value =
          candidates.find((candidate) =>
            normalizeTextValue(candidate[field] ?? ""),
          )?.[field] ?? "";

        return [field, normalizeTextValue(value)];
      }),
    ),
  };
}

function buildFailureResult(
  request: ExtractJobRequest,
  type: "blocked" | "error",
  warning: string,
): ExtractJobResult {
  const normalizedJobUrl = normalizeJobUrl(request.jobUrl);

  return {
    company: "",
    extractionStatus: "manual_only",
    jobId: "",
    jobUrl: normalizedJobUrl,
    normalizedJobUrl,
    outcome: type,
    role: "",
    warnings: [warning],
  };
}

function buildSuccessResult(
  request: ExtractJobRequest,
  extractedFields: ExtractableJobFields,
  additionalWarnings: string[] = [],
): ExtractJobResult {
  const normalizedJobUrl = normalizeJobUrl(
    extractedFields.jobUrl || request.jobUrl,
  );
  const hasCompanyAndRole = Boolean(
    extractedFields.company && extractedFields.role,
  );
  const hasUsefulFields = Boolean(
    extractedFields.company || extractedFields.role || extractedFields.jobId,
  );

  if (hasCompanyAndRole) {
    return {
      ...extractedFields,
      extractionStatus: "complete",
      jobUrl: extractedFields.jobUrl || normalizedJobUrl,
      normalizedJobUrl,
      outcome: "success",
      warnings: additionalWarnings,
    };
  }

  if (hasUsefulFields) {
    return {
      ...extractedFields,
      extractionStatus: "partial",
      jobUrl: extractedFields.jobUrl || normalizedJobUrl,
      normalizedJobUrl,
      outcome: "partial",
      warnings: [
        "Extraction found partial job details. Review and complete the remaining fields manually.",
        ...additionalWarnings,
      ],
    };
  }

  return {
    ...extractedFields,
    extractionStatus: "manual_only",
    jobUrl: extractedFields.jobUrl || normalizedJobUrl,
    normalizedJobUrl,
    outcome: "partial",
    warnings: [
      "No structured job details were found. Enter the remaining fields manually.",
      ...additionalWarnings,
    ],
  };
}

export async function extractJob(
  request: ExtractJobRequest,
): Promise<ExtractJobResult> {
  try {
    const page = await loadRenderedPage(request.jobUrl);

    if (page.type !== "success") {
      return buildFailureResult(request, page.type, page.message);
    }

    const structuredFields = parseStructuredData(page.html);
    const metadataFields = parseMetadata(
      page.title,
      page.metadata,
      page.finalUrl,
    );
    const semanticFields = parseSemanticDom(page.html);
    const deterministicFields = mergeExtractedFields(
      structuredFields,
      metadataFields,
      semanticFields,
    );
    const normalizedDeterministicFields = {
      ...deterministicFields,
      jobUrl: deterministicFields.jobUrl || page.finalUrl,
    };

    if (deterministicFields.company && deterministicFields.role) {
      return buildSuccessResult(request, normalizedDeterministicFields);
    }

    const fallbackResult = await extractJobWithLlmFallback({
      html: page.html,
      metadata: page.metadata,
      normalizedJobUrl: normalizeJobUrl(
        normalizedDeterministicFields.jobUrl || request.jobUrl,
      ),
      structuredData: structuredFields,
      title: page.title,
    });

    if (fallbackResult.status !== "success") {
      return buildSuccessResult(request, normalizedDeterministicFields, [
        fallbackResult.warning,
      ]);
    }

    const mergedFields = mergeExtractedFields(
      normalizedDeterministicFields,
      fallbackResult.fields,
    );

    return buildSuccessResult(
      request,
      {
        ...mergedFields,
        jobUrl: mergedFields.jobUrl || page.finalUrl,
      },
      [fallbackResult.warning],
    );
  } catch {
    return buildFailureResult(
      request,
      "error",
      "The job page could not be loaded for extraction. Review and complete the fields manually.",
    );
  }
}
