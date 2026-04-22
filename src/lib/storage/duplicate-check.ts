import type { JobFields, SavedJob } from "@/lib/types/job";

function trimTrailingSlashes(pathname: string) {
  let normalizedPath = pathname;

  while (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  return normalizedPath;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeJobUrl(jobUrl: string) {
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

type DuplicateSearchOptions = {
  excludeId?: string;
};

export function findDuplicateUrlJob(
  jobs: SavedJob[],
  jobUrl: string,
  options: DuplicateSearchOptions = {},
) {
  const normalizedJobUrl = normalizeJobUrl(jobUrl);

  return jobs.find((job) => {
    if (options.excludeId && job.id === options.excludeId) {
      return false;
    }

    return normalizeJobUrl(job.jobUrl) === normalizedJobUrl;
  });
}

export function findProbableDuplicateJob(
  jobs: SavedJob[],
  job: Pick<JobFields, "company" | "role" | "jobId">,
  options: DuplicateSearchOptions = {},
) {
  const normalizedCompany = normalizeText(job.company);
  const normalizedRole = normalizeText(job.role);
  const normalizedJobId = normalizeText(job.jobId);

  if (!normalizedCompany || !normalizedRole) {
    return null;
  }

  return (
    jobs.find((savedJob) => {
      if (options.excludeId && savedJob.id === options.excludeId) {
        return false;
      }

      const sameCompany = normalizeText(savedJob.company) === normalizedCompany;
      const sameRole = normalizeText(savedJob.role) === normalizedRole;

      if (!sameCompany || !sameRole) {
        return false;
      }

      if (!normalizedJobId) {
        return true;
      }

      return normalizeText(savedJob.jobId) === normalizedJobId;
    }) ?? null
  );
}

export function getProbableDuplicateWarning(
  job: Pick<JobFields, "company" | "role" | "jobId">,
) {
  return job.jobId.trim()
    ? "Possible duplicate found for the same Company, Role, and Job ID."
    : "Possible duplicate found for the same Company and Role.";
}
