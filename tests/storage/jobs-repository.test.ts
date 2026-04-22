import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  appendJob,
  DuplicateJobUrlError,
  readAllJobs,
  updateJob,
} from "@/lib/storage/jobs-repository";
import type { JobRecordInput } from "@/lib/types/job";

const tempDirectories: string[] = [];

function createTempWorkbookPath() {
  const tempDirectory = mkdtempSync(join(tmpdir(), "job-capture-"));
  tempDirectories.push(tempDirectory);
  return join(tempDirectory, "jobs.xlsx");
}

function createJob(overrides: Partial<JobRecordInput> = {}): JobRecordInput {
  return {
    company: "Example Corp",
    role: "Senior Frontend Engineer",
    jobId: "FE-123",
    dateApplied: "2026-04-22",
    visaSponsorship: "No",
    source: "LinkedIn",
    notes: "Reached from a direct posting.",
    jobUrl: "https://jobs.example.com/roles/frontend-engineer",
    extractionStatus: "complete",
    createdAt: "2026-04-22T15:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();

    if (directory) {
      rmSync(directory, { force: true, recursive: true });
    }
  }
});

describe("jobs repository", () => {
  it("appends a job row and reads it back using the locked schema", async () => {
    const filePath = createTempWorkbookPath();

    const appendResult = await appendJob(createJob(), { filePath });
    const jobs = await readAllJobs({ filePath });

    expect(appendResult.warnings).toEqual([]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual({
      id: "2",
      company: "Example Corp",
      role: "Senior Frontend Engineer",
      jobId: "FE-123",
      dateApplied: "2026-04-22",
      visaSponsorship: "No",
      source: "LinkedIn",
      notes: "Reached from a direct posting.",
      jobUrl: "https://jobs.example.com/roles/frontend-engineer",
      extractionStatus: "complete",
      createdAt: "2026-04-22T15:00:00.000Z",
    });
  });

  it("blocks appending a duplicate job URL", async () => {
    const filePath = createTempWorkbookPath();

    await appendJob(createJob(), { filePath });

    await expect(
      appendJob(
        createJob({
          company: "Different Company",
          jobUrl: "https://jobs.example.com/roles/frontend-engineer/",
        }),
        { filePath },
      ),
    ).rejects.toBeInstanceOf(DuplicateJobUrlError);
  });

  it("updates a saved row and persists the changed values", async () => {
    const filePath = createTempWorkbookPath();

    const appendResult = await appendJob(createJob(), { filePath });
    const updateResult = await updateJob(
      appendResult.job.id,
      {
        notes: "Updated after the initial application.",
        role: "Staff Frontend Engineer",
      },
      { filePath },
    );
    const jobs = await readAllJobs({ filePath });

    expect(updateResult.warnings).toEqual([]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.role).toBe("Staff Frontend Engineer");
    expect(jobs[0]?.notes).toBe("Updated after the initial application.");
  });

  it("saves a probable duplicate and returns a warning", async () => {
    const filePath = createTempWorkbookPath();

    await appendJob(createJob(), { filePath });

    const appendResult = await appendJob(
      createJob({
        createdAt: "2026-04-22T15:05:00.000Z",
        jobUrl: "https://jobs.example.com/roles/frontend-engineer-copy",
      }),
      { filePath },
    );
    const jobs = await readAllJobs({ filePath });

    expect(appendResult.warnings).toEqual([
      "Possible duplicate found for the same Company, Role, and Job ID.",
    ]);
    expect(jobs).toHaveLength(2);
  });
});
