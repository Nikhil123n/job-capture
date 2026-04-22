import type { ExtractableJobFields } from "@/lib/types/job";

import type { LoadedPageMetadata } from "./page-loader";

function getFirstNonEmpty(values: Array<string | undefined>) {
  return values.find((value) => value && value.trim())?.trim() ?? "";
}

function splitOnSeparator(value: string, separator: string) {
  const index = value.indexOf(separator);

  if (index === -1) {
    return null;
  }

  return [
    value.slice(0, index).trim(),
    value.slice(index + separator.length).trim(),
  ];
}

function extractTitleParts(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return { company: "", role: "" };
  }

  const atSplit = splitOnSeparator(normalizedValue, " at ");

  if (atSplit) {
    return {
      company: atSplit[1] ?? "",
      role: atSplit[0] ?? "",
    };
  }

  for (const separator of [" | ", " - ", " — ", " – "]) {
    const parts = normalizedValue
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return {
        company: parts.at(-1) ?? "",
        role: parts[0] ?? "",
      };
    }
  }

  return {
    company: "",
    role: normalizedValue,
  };
}

export function parseMetadata(
  title: string,
  metadata: LoadedPageMetadata,
  finalUrl: string,
): Partial<ExtractableJobFields> {
  const metadataTitle = getFirstNonEmpty([
    metadata.metaByProperty["og:title"],
    metadata.metaByName["twitter:title"],
    title,
  ]);
  const titleParts = extractTitleParts(metadataTitle);

  return {
    company:
      getFirstNonEmpty([
        metadata.metaByName["company"],
        metadata.metaByProperty["og:site_name"],
        metadata.applicationName,
        titleParts.company,
      ]) || "",
    jobId: getFirstNonEmpty([
      metadata.metaByName["job_id"],
      metadata.metaByName["jobid"],
      metadata.metaByName["linkedin:jobid"],
      metadata.metaByProperty["job:id"],
      metadata.metaByProperty["job:job_id"],
    ]),
    jobUrl: getFirstNonEmpty([metadata.canonicalUrl, finalUrl]),
    role: titleParts.role,
  };
}
