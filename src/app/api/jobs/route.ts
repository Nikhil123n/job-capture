import { NextResponse } from "next/server";

import type {
  JobsListErrorResponse,
  JobsListResponse,
  JobsSortOrder,
  SavedJob,
} from "@/lib/types/job";
import { readAllJobs } from "@/lib/storage/jobs-repository";

export const runtime = "nodejs";

function sortJobsByDateApplied(jobs: SavedJob[], sort: JobsSortOrder) {
  return [...jobs].sort((left, right) => {
    const leftDate = new Date(left.dateApplied).getTime();
    const rightDate = new Date(right.dateApplied).getTime();

    if (sort === "date_asc") {
      return leftDate - rightDate;
    }

    return rightDate - leftDate;
  });
}

function filterJobs(jobs: SavedJob[], search: string, source: string) {
  const normalizedSearch = search.trim().toLowerCase();
  const normalizedSource = source.trim();

  return jobs.filter((job) => {
    if (normalizedSource && job.source !== normalizedSource) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [job.company, job.role, job.jobId, job.notes, job.jobUrl, job.source]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const source = searchParams.get("source") ?? "";
    const sort =
      (searchParams.get("sort") as JobsSortOrder | null) ?? "date_desc";
    const normalizedSort: JobsSortOrder =
      sort === "date_asc" ? "date_asc" : "date_desc";
    const jobs = await readAllJobs();
    const filteredJobs = filterJobs(jobs, search, source);

    return NextResponse.json<JobsListResponse>({
      jobs: sortJobsByDateApplied(filteredJobs, normalizedSort),
    });
  } catch {
    return NextResponse.json<JobsListErrorResponse>(
      {
        error: {
          code: "unexpected_error",
          message: "Saved jobs could not be loaded.",
        },
        jobs: [],
        warnings: [],
      },
      { status: 500 },
    );
  }
}
