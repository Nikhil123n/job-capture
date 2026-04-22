import { load, type CheerioAPI } from "cheerio";

import type { ExtractableJobFields } from "@/lib/types/job";

function getTextValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function getFirstText($: CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const text = getTextValue($(selector).first().text());

    if (text) {
      return text;
    }
  }

  return "";
}

function getFirstAttribute(
  $: CheerioAPI,
  selectors: string[],
  attributeName: string,
) {
  for (const selector of selectors) {
    const value = getTextValue($(selector).first().attr(attributeName));

    if (value) {
      return value;
    }
  }

  return "";
}

function findDefinitionValue($: CheerioAPI, labels: string[]) {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  let match = "";

  $("dt").each((_, element) => {
    const label = getTextValue($(element).text()).toLowerCase();

    if (!normalizedLabels.includes(label)) {
      return;
    }

    const value = getTextValue($(element).next("dd").text());

    if (value) {
      match = value;
      return false;
    }
  });

  if (match) {
    return match;
  }

  $("main li, main p, main div, article li, article p, article div, li, p, div")
    .toArray()
    .some((element) => {
      const text = getTextValue($(element).text());

      if (!text.includes(":")) {
        return false;
      }

      const [rawLabel, ...rawValueParts] = text.split(":");
      const label = getTextValue(rawLabel).toLowerCase();

      if (!normalizedLabels.includes(label)) {
        return false;
      }

      const value = getTextValue(rawValueParts.join(":"));

      if (!value) {
        return false;
      }

      match = value;
      return true;
    });

  return match;
}

export function parseSemanticDom(html: string): Partial<ExtractableJobFields> {
  const $ = load(html);

  return {
    company:
      getFirstText($, [
        "[data-company-name]",
        '[data-testid="company-name"]',
        '[itemprop="hiringOrganization"]',
        '[aria-label="Company"]',
      ]) || findDefinitionValue($, ["Company", "Employer", "Organization"]),
    jobId:
      getFirstAttribute(
        $,
        [
          "[data-job-id]",
          "[data-req-id]",
          "[data-requisition-id]",
          '[data-testid="job-id"]',
        ],
        "data-job-id",
      ) ||
      getFirstAttribute($, ["[data-req-id]"], "data-req-id") ||
      getFirstAttribute($, ["[data-requisition-id]"], "data-requisition-id") ||
      findDefinitionValue($, [
        "Job ID",
        "Job Id",
        "Job Number",
        "Req ID",
        "Requisition ID",
      ]),
    role: getFirstText($, ["main h1", "article h1", '[role="main"] h1', "h1"]),
  };
}
