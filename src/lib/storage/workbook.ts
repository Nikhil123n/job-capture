import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import ExcelJS from "exceljs";

import type { JobFields } from "@/lib/types/job";

export const JOB_WORKSHEET_NAME = "Jobs";

export const JOB_COLUMN_DEFINITIONS: ReadonlyArray<{
  field: keyof JobFields;
  header: string;
}> = [
  { field: "company", header: "Company" },
  { field: "role", header: "Role" },
  { field: "jobId", header: "Job ID" },
  { field: "dateApplied", header: "Date Applied" },
  { field: "visaSponsorship", header: "Visa Sponsorship" },
  { field: "source", header: "Source" },
  { field: "notes", header: "Notes" },
  { field: "jobUrl", header: "Job URL" },
  { field: "extractionStatus", header: "Extraction Status" },
  { field: "createdAt", header: "Created At" },
] as const;

export const JOB_COLUMN_HEADERS = JOB_COLUMN_DEFINITIONS.map(
  (column) => column.header,
);

type EnsureWorkbookOptions = {
  filePath?: string;
};

function isMissingFileError(error: unknown) {
  return (
    error instanceof Error &&
    (("code" in error &&
      typeof error.code === "string" &&
      error.code === "ENOENT") ||
      error.message.includes("File not found"))
  );
}

export function getWorkbookPath() {
  return resolve(process.cwd(), "data", "jobs.xlsx");
}

export function getColumnNumber(field: keyof JobFields) {
  const columnIndex = JOB_COLUMN_DEFINITIONS.findIndex(
    (column) => column.field === field,
  );

  if (columnIndex === -1) {
    throw new Error(`Unknown job field: ${field}`);
  }

  return columnIndex + 1;
}

export async function ensureWorkbook(options: EnsureWorkbookOptions = {}) {
  const filePath = options.filePath ?? getWorkbookPath();

  await mkdir(dirname(filePath), { recursive: true });

  const workbook = new ExcelJS.Workbook();
  let needsWrite = false;

  try {
    await workbook.xlsx.readFile(filePath);
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }

    needsWrite = true;
  }

  let worksheet = workbook.getWorksheet(JOB_WORKSHEET_NAME);

  if (!worksheet) {
    worksheet = workbook.addWorksheet(JOB_WORKSHEET_NAME);
    needsWrite = true;
  }

  const headerRow = worksheet.getRow(1);
  const headerMismatch = JOB_COLUMN_HEADERS.some((header, index) => {
    const currentValue = headerRow.getCell(index + 1).value;
    return currentValue !== header;
  });

  if (headerMismatch) {
    JOB_COLUMN_HEADERS.forEach((header, index) => {
      headerRow.getCell(index + 1).value = header;
    });
    needsWrite = true;
  }

  if (needsWrite) {
    await workbook.xlsx.writeFile(filePath);
  }

  return {
    filePath,
    workbook,
    worksheet,
  };
}
