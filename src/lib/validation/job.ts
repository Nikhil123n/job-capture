import { format } from "date-fns";
import { z } from "zod";

import { JOB_SOURCES, type JobSource } from "@/lib/config/sources";

const jobSourceSchema = z.enum(JOB_SOURCES);
const extractionStatusSchema = z.enum(["complete", "partial", "manual_only"]);
const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(["unexpected_error", "validation_error"]),
    message: z.string().trim().min(1),
  }),
  warnings: z.array(z.string()).default([]),
});

export const addJobFormSchema = z
  .object({
    jobUrl: z.string().trim().min(1, "Job URL is required."),
    source: z
      .string()
      .trim()
      .min(1, "Source is required.")
      .refine(
        (value) => JOB_SOURCES.includes(value as JobSource),
        "Select a valid source.",
      ),
    visaSponsorship: z.string().trim(),
    notes: z.string().trim(),
    company: z.string().trim(),
    role: z.string().trim(),
    jobId: z.string().trim(),
    dateApplied: z.string().trim().min(1, "Date Applied is required."),
    createdAt: z.string().trim().min(1, "Created At is required."),
    extractionStatus: extractionStatusSchema,
  })
  .refine((values) => values.company || values.role, {
    message: "Enter a Company or Role before saving.",
    path: ["role"],
  });

export type AddJobFormValues = z.input<typeof addJobFormSchema>;

export const extractJobRequestSchema = z.object({
  jobUrl: z.string().trim().url("Enter a valid job URL."),
  source: jobSourceSchema,
});

export type ExtractJobRequestValues = z.infer<typeof extractJobRequestSchema>;

export const extractJobResultSchema = z.object({
  company: z.string().trim(),
  extractionStatus: extractionStatusSchema,
  jobId: z.string().trim(),
  jobUrl: z.string().trim(),
  normalizedJobUrl: z.string().trim(),
  outcome: z.enum(["success", "partial", "blocked", "error"]),
  role: z.string().trim(),
  warnings: z.array(z.string()),
});

export const extractJobErrorResponseSchema = apiErrorResponseSchema;

const editableJobFieldSchema = {
  company: z.string().trim(),
  role: z.string().trim(),
  jobId: z.string().trim(),
  dateApplied: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date Applied must use YYYY-MM-DD."),
  visaSponsorship: z.string().trim(),
  source: jobSourceSchema,
  notes: z.string().trim(),
  jobUrl: z.string().trim().url("Enter a valid job URL."),
  extractionStatus: extractionStatusSchema,
} satisfies Record<string, z.ZodTypeAny>;

export const updateJobRequestSchema = z
  .object(editableJobFieldSchema)
  .refine((values) => values.company || values.role, {
    message: "Enter a Company or Role before saving.",
    path: ["role"],
  });

export const saveJobRequestSchema = z
  .object({
    ...editableJobFieldSchema,
    createdAt: z
      .string()
      .trim()
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/,
        "Created At must use a local datetime value.",
      ),
  })
  .refine((values) => values.company || values.role, {
    message: "Enter a Company or Role before saving.",
    path: ["role"],
  });

export type SaveJobRequestValues = z.infer<typeof saveJobRequestSchema>;
export type UpdateJobRequestValues = z.infer<typeof updateJobRequestSchema>;

export const savedJobSchema = saveJobRequestSchema.extend({
  id: z.string().trim().min(1),
});

export const saveJobResponseSchema = z.discriminatedUnion("success", [
  z.object({
    job: savedJobSchema,
    message: z.string().trim().min(1),
    success: z.literal(true),
    warnings: z.array(z.string()),
  }),
  z.object({
    error: z.object({
      code: z.enum(["duplicate_url", "validation_error", "unexpected_error"]),
      message: z.string().trim().min(1),
    }),
    success: z.literal(false),
    warnings: z.array(z.string()),
  }),
]);

export const updateJobResponseSchema = z.discriminatedUnion("success", [
  z.object({
    job: savedJobSchema,
    message: z.string().trim().min(1),
    success: z.literal(true),
    warnings: z.array(z.string()),
  }),
  z.object({
    error: z.object({
      code: z.enum([
        "duplicate_url",
        "not_found",
        "validation_error",
        "unexpected_error",
      ]),
      message: z.string().trim().min(1),
    }),
    success: z.literal(false),
    warnings: z.array(z.string()),
  }),
]);

export const jobsListResponseSchema = z.object({
  jobs: z.array(savedJobSchema),
});

export const jobsListErrorResponseSchema = apiErrorResponseSchema.extend({
  jobs: z.array(savedJobSchema).max(0).default([]),
});

export function createAddJobFormDefaults(now = new Date()): AddJobFormValues {
  return {
    jobUrl: "",
    source: "",
    visaSponsorship: "",
    notes: "",
    company: "",
    role: "",
    jobId: "",
    dateApplied: format(now, "yyyy-MM-dd"),
    createdAt: format(now, "yyyy-MM-dd'T'HH:mm"),
    extractionStatus: "manual_only",
  };
}
