import { load } from "cheerio";

import type { ExtractableJobFields } from "@/lib/types/job";

type StructuredNode = Record<string, unknown>;

function getArrayValue(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function getTextValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function flattenStructuredNode(value: unknown): StructuredNode[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const node = value as StructuredNode;
  const nodes = [node];
  const graph = getArrayValue(node["@graph"]);

  graph.forEach((item) => {
    nodes.push(...flattenStructuredNode(item));
  });

  return nodes;
}

function hasJobPostingType(node: StructuredNode) {
  return getArrayValue(node["@type"]).some(
    (type) => getTextValue(type).toLowerCase() === "jobposting",
  );
}

function getHiringOrganizationName(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(getHiringOrganizationName).find(Boolean) ?? "";
  }

  if (value && typeof value === "object") {
    return getTextValue((value as StructuredNode).name);
  }

  return getTextValue(value);
}

function getIdentifierValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(getIdentifierValue).find(Boolean) ?? "";
  }

  if (value && typeof value === "object") {
    const identifier = value as StructuredNode;

    return (
      getTextValue(identifier.value) ||
      getTextValue(identifier.name) ||
      getTextValue(identifier["@value"])
    );
  }

  return getTextValue(value);
}

function getBestJobPostingCandidate(nodes: StructuredNode[]) {
  const scoredCandidates = nodes
    .filter(hasJobPostingType)
    .map((node) => {
      const candidate = {
        company: getHiringOrganizationName(node.hiringOrganization),
        jobId: getIdentifierValue(node.identifier),
        jobUrl: getTextValue(node.url),
        role: getTextValue(node.title),
      };
      const score = Object.values(candidate).filter(Boolean).length;

      return { candidate, score };
    })
    .sort((left, right) => right.score - left.score);

  return scoredCandidates[0]?.candidate;
}

export function parseStructuredData(
  html: string,
): Partial<ExtractableJobFields> {
  const $ = load(html);
  const nodes = $("script[type='application/ld+json']")
    .toArray()
    .flatMap((element) => {
      const content = $(element).text().trim();

      if (!content) {
        return [];
      }

      try {
        const parsed = JSON.parse(content) as unknown;
        const items = Array.isArray(parsed) ? parsed : [parsed];

        return items.flatMap((item) => flattenStructuredNode(item));
      } catch {
        return [];
      }
    });

  return getBestJobPostingCandidate(nodes) ?? {};
}
