import type ExcelJS from "exceljs";

import type {
  JobFields,
  JobRecordInput,
  JobRecordUpdate,
  SavedJob,
} from "@/lib/types/job";

import {
  findDuplicateUrlJob,
  findProbableDuplicateJob,
  getProbableDuplicateWarning,
  normalizeJobUrl,
} from "@/lib/storage/duplicate-check";
import {
  ensureWorkbook,
  getColumnNumber,
  JOB_COLUMN_DEFINITIONS,
} from "@/lib/storage/workbook";

type RepositoryOptions = {
  filePath?: string;
};

export type SaveJobResult = {
  job: SavedJob;
  warnings: string[];
};

export class DuplicateJobUrlError extends Error {
  existingJob: SavedJob;

  constructor(existingJob: SavedJob) {
    super("A job with the same URL already exists.");
    this.name = "DuplicateJobUrlError";
    this.existingJob = existingJob;
  }
}

export class JobRowNotFoundError extends Error {
  constructor(id: string) {
    super(`Job row not found: ${id}`);
    this.name = "JobRowNotFoundError";
  }
}

function normalizeFieldValue(value: string) {
  return value.trim();
}

function normalizeJobInput(job: JobRecordInput): JobRecordInput {
  return {
    company: normalizeFieldValue(job.company),
    role: normalizeFieldValue(job.role),
    jobId: normalizeFieldValue(job.jobId),
    dateApplied: normalizeFieldValue(job.dateApplied),
    visaSponsorship: normalizeFieldValue(job.visaSponsorship),
    source: normalizeFieldValue(job.source) as JobFields["source"],
    notes: normalizeFieldValue(job.notes),
    jobUrl: normalizeJobUrl(job.jobUrl),
    extractionStatus: normalizeFieldValue(
      job.extractionStatus,
    ) as JobFields["extractionStatus"],
    createdAt: normalizeFieldValue(job.createdAt),
  };
}

function toJobRecordInput(job: SavedJob): JobRecordInput {
  return {
    company: job.company,
    role: job.role,
    jobId: job.jobId,
    dateApplied: job.dateApplied,
    visaSponsorship: job.visaSponsorship,
    source: job.source,
    notes: job.notes,
    jobUrl: job.jobUrl,
    extractionStatus: job.extractionStatus,
    createdAt: job.createdAt,
  };
}

function getCellStringValue(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  ) {
    return String(value).trim();
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }

    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return value.hyperlink.trim();
    }

    if (
      "result" in value &&
      value.result !== undefined &&
      value.result !== null
    ) {
      return String(value.result).trim();
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((part) => part.text)
        .join("")
        .trim();
    }
  }

  return String(value).trim();
}

function mapRowToSavedJob(row: ExcelJS.Row, rowNumber: number): SavedJob {
  const job = JOB_COLUMN_DEFINITIONS.reduce(
    (record, column) => {
      record[column.field] = getCellStringValue(
        row.getCell(getColumnNumber(column.field)).value,
      );
      return record;
    },
    {} as Record<keyof JobFields, string>,
  );

  const normalizedJob = normalizeJobInput(job as JobRecordInput);

  return {
    id: String(rowNumber),
    ...normalizedJob,
  };
}

function isEmptyJobRow(job: SavedJob) {
  return JOB_COLUMN_DEFINITIONS.every((column) => !job[column.field]);
}

async function loadJobs(options: RepositoryOptions = {}) {
  const workbookState = await ensureWorkbook(options);
  const jobs: SavedJob[] = [];

  workbookState.worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const savedJob = mapRowToSavedJob(row, rowNumber);

    if (!isEmptyJobRow(savedJob)) {
      jobs.push(savedJob);
    }
  });

  return {
    ...workbookState,
    jobs,
  };
}

function getDuplicateWarnings(
  existingJobs: SavedJob[],
  job: JobRecordInput,
  excludeId?: string,
) {
  const probableDuplicate = findProbableDuplicateJob(existingJobs, job, {
    excludeId,
  });

  return probableDuplicate ? [getProbableDuplicateWarning(job)] : [];
}

export async function readAllJobs(options: RepositoryOptions = {}) {
  const { jobs } = await loadJobs(options);
  return jobs;
}

export async function appendJob(
  job: JobRecordInput,
  options: RepositoryOptions = {},
): Promise<SaveJobResult> {
  const normalizedJob = normalizeJobInput(job);
  const { filePath, jobs, workbook, worksheet } = await loadJobs(options);
  const duplicateUrlJob = findDuplicateUrlJob(jobs, normalizedJob.jobUrl);

  if (duplicateUrlJob) {
    throw new DuplicateJobUrlError(duplicateUrlJob);
  }

  const warnings = getDuplicateWarnings(jobs, normalizedJob);
  const rowValues = JOB_COLUMN_DEFINITIONS.map(
    (column) => normalizedJob[column.field],
  );
  const appendedRow = worksheet.addRow(rowValues);

  await workbook.xlsx.writeFile(filePath);

  return {
    job: {
      id: String(appendedRow.number),
      ...normalizedJob,
    },
    warnings,
  };
}

export async function updateJob(
  id: string,
  updates: JobRecordUpdate,
  options: RepositoryOptions = {},
): Promise<SaveJobResult> {
  const { filePath, jobs, workbook, worksheet } = await loadJobs(options);
  const existingJob = jobs.find((job) => job.id === id);

  if (!existingJob) {
    throw new JobRowNotFoundError(id);
  }

  const mergedJob = normalizeJobInput({
    ...toJobRecordInput(existingJob),
    ...updates,
  });
  const duplicateUrlJob = findDuplicateUrlJob(jobs, mergedJob.jobUrl, {
    excludeId: id,
  });

  if (duplicateUrlJob) {
    throw new DuplicateJobUrlError(duplicateUrlJob);
  }

  const rowNumber = Number(id);
  const row = worksheet.getRow(rowNumber);

  JOB_COLUMN_DEFINITIONS.forEach((column) => {
    row.getCell(getColumnNumber(column.field)).value = mergedJob[column.field];
  });

  row.commit();
  await workbook.xlsx.writeFile(filePath);

  return {
    job: {
      id,
      ...mergedJob,
    },
    warnings: getDuplicateWarnings(jobs, mergedJob, id),
  };
}
