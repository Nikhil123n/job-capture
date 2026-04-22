import { chromium } from "playwright";

export type LoadedPageMetadata = {
  applicationName: string;
  canonicalUrl: string;
  metaByName: Record<string, string>;
  metaByProperty: Record<string, string>;
};

export type LoadedPage = {
  finalUrl: string;
  html: string;
  metadata: LoadedPageMetadata;
  title: string;
  type: "success";
};

export type FailedPageLoad = {
  finalUrl: string;
  message: string;
  type: "blocked" | "error";
};

export type PageLoadResult = FailedPageLoad | LoadedPage;

const BLOCKED_CONTENT_MARKERS = [
  "access denied",
  "captcha",
  "forbidden",
  "unusual traffic",
  "verify you are human",
] as const;

const BLOCKED_STATUS_CODES = new Set([401, 403, 429]);

function hasBlockedMarker(value: string) {
  const normalizedValue = value.toLowerCase();

  return BLOCKED_CONTENT_MARKERS.some((marker) =>
    normalizedValue.includes(marker),
  );
}

export async function loadRenderedPage(
  jobUrl: string,
): Promise<PageLoadResult> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const response = await page.goto(jobUrl, {
      timeout: 20_000,
      waitUntil: "domcontentloaded",
    });

    try {
      await page.waitForLoadState("networkidle", { timeout: 5_000 });
    } catch {
      // Some job pages never reach networkidle; use the rendered DOM we already have.
    }

    const title = (await page.title()).trim();
    const finalUrl = page.url();
    const html = await page.content();
    const metadata = await page.evaluate(() => {
      const metaByName: Record<string, string> = {};
      const metaByProperty: Record<string, string> = {};

      document.querySelectorAll("meta").forEach((tag) => {
        const content = tag.getAttribute("content")?.trim();

        if (!content) {
          return;
        }

        const name = tag.getAttribute("name")?.trim().toLowerCase();
        const property = tag.getAttribute("property")?.trim().toLowerCase();

        if (name) {
          metaByName[name] = content;
        }

        if (property) {
          metaByProperty[property] = content;
        }
      });

      return {
        applicationName:
          document
            .querySelector('meta[name="application-name"]')
            ?.getAttribute("content")
            ?.trim() ?? "",
        canonicalUrl:
          document
            .querySelector('link[rel="canonical"]')
            ?.getAttribute("href")
            ?.trim() || window.location.href,
        metaByName,
        metaByProperty,
      };
    });

    const responseStatus = response?.status();
    const blockedByStatus =
      responseStatus !== undefined && BLOCKED_STATUS_CODES.has(responseStatus);
    const blockedByContent = hasBlockedMarker(`${title}\n${html}`);

    if (blockedByStatus || blockedByContent) {
      return {
        finalUrl,
        message:
          "The job page appears to block automated access. Review and complete the fields manually.",
        type: "blocked",
      };
    }

    if (responseStatus !== undefined && responseStatus >= 400) {
      return {
        finalUrl,
        message:
          "The job page could not be loaded for extraction. Review and complete the fields manually.",
        type: "error",
      };
    }

    return {
      finalUrl,
      html,
      metadata,
      title,
      type: "success",
    };
  } catch {
    return {
      finalUrl: jobUrl,
      message:
        "The job page could not be loaded for extraction. Review and complete the fields manually.",
      type: "error",
    };
  } finally {
    await browser?.close();
  }
}
