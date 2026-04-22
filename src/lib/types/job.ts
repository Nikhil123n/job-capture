import type { JobSource } from "@/lib/config/sources";

export type ExtractionStatus = "complete" | "partial" | "manual_only";
export type ExtractionOutcome = "success" | "partial" | "blocked" | "error";

export type JobFields = {
  company: string;
  role: string;
  jobId: string;
  dateApplied: string;
  visaSponsorship: string;
  source: JobSource;
  notes: string;
  jobUrl: string;
  extractionStatus: ExtractionStatus;
  createdAt: string;
};

export type SavedJob = JobFields & {
  id: string;
};

export type JobRecordInput = JobFields;

export type JobRecordUpdate = Partial<JobFields>;

export type ExtractJobRequest = {
  jobUrl: string;
  source: JobSource;
};

export type ExtractableJobFields = Pick<
  JobFields,
  "company" | "role" | "jobId" | "jobUrl"
>;

export type EditableJobFields = Pick<
  JobFields,
  | "company"
  | "role"
  | "jobId"
  | "dateApplied"
  | "visaSponsorship"
  | "source"
  | "notes"
  | "jobUrl"
  | "extractionStatus"
>;

export type ExtractJobResult = ExtractableJobFields &
  Pick<JobFields, "extractionStatus"> & {
    outcome: ExtractionOutcome;
    normalizedJobUrl: string;
    warnings: string[];
  };

export type ApiErrorCode = "unexpected_error" | "validation_error";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
  warnings: string[];
};

export type SaveJobRequest = JobRecordInput;
export type UpdateJobRequest = EditableJobFields;

export type SaveJobSuccessResponse = {
  success: true;
  job: SavedJob;
  message: string;
  warnings: string[];
};

export type SaveJobErrorCode =
  | "duplicate_url"
  | "validation_error"
  | "unexpected_error";

export type SaveJobErrorResponse = {
  success: false;
  error: {
    code: SaveJobErrorCode;
    message: string;
  };
  warnings: string[];
};

export type SaveJobResponse = SaveJobErrorResponse | SaveJobSuccessResponse;

export type UpdateJobSuccessResponse = {
  success: true;
  job: SavedJob;
  message: string;
  warnings: string[];
};

export type UpdateJobErrorCode =
  | "duplicate_url"
  | "not_found"
  | "validation_error"
  | "unexpected_error";

export type UpdateJobErrorResponse = {
  success: false;
  error: {
    code: UpdateJobErrorCode;
    message: string;
  };
  warnings: string[];
};

export type UpdateJobResponse =
  | UpdateJobErrorResponse
  | UpdateJobSuccessResponse;

export type JobsSortOrder = "date_asc" | "date_desc";

export type JobsListResponse = {
  jobs: SavedJob[];
};

export type JobsListErrorResponse = ApiErrorResponse & {
  jobs: [];
};
