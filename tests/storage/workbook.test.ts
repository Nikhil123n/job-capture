import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import ExcelJS from "exceljs";
import { afterEach, describe, expect, it } from "vitest";

import {
  JOB_COLUMN_HEADERS,
  JOB_COLUMN_DEFINITIONS,
  JOB_WORKSHEET_NAME,
  getColumnNumber,
  ensureWorkbook,
} from "@/lib/storage/workbook";

const tempDirectories: string[] = [];

afterEach(() => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();

    if (directory) {
      rmSync(directory, { force: true, recursive: true });
    }
  }
});

describe("ensureWorkbook", () => {
  it("creates the workbook with the locked worksheet and header order", async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "job-capture-"));
    tempDirectories.push(tempDirectory);

    const filePath = join(tempDirectory, "jobs.xlsx");
    await ensureWorkbook({ filePath });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(JOB_WORKSHEET_NAME);
    const headers = JOB_COLUMN_HEADERS.map(
      (_, index) => worksheet?.getRow(1).getCell(index + 1).value,
    );

    expect(worksheet).toBeDefined();
    expect(headers).toEqual([...JOB_COLUMN_HEADERS]);
  });

  it("returns stable column numbers for the locked job schema", () => {
    const positions = JOB_COLUMN_DEFINITIONS.map((column) => ({
      columnNumber: getColumnNumber(column.field),
      field: column.field,
    }));

    expect(positions).toEqual([
      { columnNumber: 1, field: "company" },
      { columnNumber: 2, field: "role" },
      { columnNumber: 3, field: "jobId" },
      { columnNumber: 4, field: "dateApplied" },
      { columnNumber: 5, field: "visaSponsorship" },
      { columnNumber: 6, field: "source" },
      { columnNumber: 7, field: "notes" },
      { columnNumber: 8, field: "jobUrl" },
      { columnNumber: 9, field: "extractionStatus" },
      { columnNumber: 10, field: "createdAt" },
    ]);
  });
});
