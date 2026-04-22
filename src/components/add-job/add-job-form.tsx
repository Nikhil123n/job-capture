"use client";

import { useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { JOB_SOURCES } from "@/lib/config/sources";
import type { ExtractJobResult, SaveJobResponse } from "@/lib/types/job";
import {
  addJobFormSchema,
  createAddJobFormDefaults,
  extractJobErrorResponseSchema,
  extractJobResultSchema,
  saveJobResponseSchema,
  type AddJobFormValues,
} from "@/lib/validation/job";

import { ExtractionWarning } from "./extraction-warning";

type FeedbackState = {
  kind: "error" | "info";
  message: string;
} | null;

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-rose-700">{message}</p>;
}

function normalizeFormValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function AddJobForm() {
  const [defaultValues] = useState(() => createAddJobFormDefaults());
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const extractionRequestIdRef = useRef(0);

  const {
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
    trigger,
  } = useForm<AddJobFormValues>({
    defaultValues,
    resolver: zodResolver(addJobFormSchema),
  });

  function createFreshDefaults() {
    return createAddJobFormDefaults();
  }

  function isLatestExtractRequest(requestId: number) {
    return extractionRequestIdRef.current === requestId;
  }

  function hasExtractTargetChanged(
    submittedJobUrl: string,
    submittedSource: string,
  ) {
    return (
      normalizeFormValue(getValues("jobUrl")) !== submittedJobUrl ||
      normalizeFormValue(getValues("source")) !== submittedSource
    );
  }

  function mergeExtractedField(
    field: "company" | "jobId" | "role",
    value: string,
  ) {
    const currentValue = normalizeFormValue(getValues(field));

    if (!currentValue && value.trim()) {
      setValue(field, value, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  async function handleExtractClick() {
    const isValid = await trigger(["jobUrl", "source"]);

    if (!isValid) {
      setFeedback({
        kind: "error",
        message: "Enter a Job URL and Source before extracting job details.",
      });
      return;
    }

    const submittedJobUrl = normalizeFormValue(getValues("jobUrl"));
    const submittedSource = normalizeFormValue(getValues("source"));
    const requestId = extractionRequestIdRef.current + 1;

    extractionRequestIdRef.current = requestId;
    setIsExtracting(true);

    try {
      const response = await fetch("/api/extract-job", {
        body: JSON.stringify({
          jobUrl: submittedJobUrl,
          source: submittedSource,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      let responseBody: unknown;

      try {
        responseBody = await response.json();
      } catch {
        setFeedback({
          kind: "error",
          message:
            "Extraction returned an unreadable response. Review and complete the fields manually.",
        });
        return;
      }

      if (!response.ok) {
        const parsedError =
          extractJobErrorResponseSchema.safeParse(responseBody);

        setFeedback({
          kind: "error",
          message: parsedError.success
            ? parsedError.data.error.message
            : "Extraction request could not be completed. Review and complete the fields manually.",
        });
        return;
      }

      const parsedResult = extractJobResultSchema.safeParse(responseBody);

      if (!parsedResult.success) {
        setFeedback({
          kind: "error",
          message:
            "Extraction returned an unreadable response. Review and complete the fields manually.",
        });
        return;
      }

      if (
        !isLatestExtractRequest(requestId) ||
        hasExtractTargetChanged(submittedJobUrl, submittedSource)
      ) {
        setFeedback({
          kind: "info",
          message:
            "Extraction finished for an older form state and was ignored.",
        });
        return;
      }

      const extractionResult = parsedResult.data as ExtractJobResult;

      setValue("jobUrl", extractionResult.normalizedJobUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("extractionStatus", extractionResult.extractionStatus, {
        shouldDirty: true,
      });

      mergeExtractedField("company", extractionResult.company);
      mergeExtractedField("jobId", extractionResult.jobId);
      mergeExtractedField("role", extractionResult.role);

      setFeedback({
        kind:
          extractionResult.outcome === "blocked" ||
          extractionResult.outcome === "error"
            ? "error"
            : "info",
        message:
          extractionResult.warnings.join(" ") ||
          "Extraction applied to the editable fields.",
      });
    } catch {
      setFeedback({
        kind: "error",
        message:
          "Extraction failed unexpectedly. Review and complete the fields manually.",
      });
    } finally {
      setIsExtracting(false);
    }
  }

  function handleResetClick() {
    extractionRequestIdRef.current += 1;
    reset(createFreshDefaults());
    setFeedback({
      kind: "info",
      message: "Form reset to the default local-first values.",
    });
  }

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={handleSubmit(
        async (values) => {
          try {
            const response = await fetch("/api/save-job", {
              body: JSON.stringify(values),
              headers: {
                "Content-Type": "application/json",
              },
              method: "POST",
            });
            let responseBody: unknown;

            try {
              responseBody = await response.json();
            } catch {
              setFeedback({
                kind: "error",
                message: "The job could not be saved. Try again.",
              });
              return;
            }

            const parsedSaveResult =
              saveJobResponseSchema.safeParse(responseBody);

            if (!parsedSaveResult.success) {
              setFeedback({
                kind: "error",
                message: "The job could not be saved. Try again.",
              });
              return;
            }

            const saveResult = parsedSaveResult.data as SaveJobResponse;

            if (!response.ok || !saveResult.success) {
              setFeedback({
                kind: "error",
                message: saveResult.success
                  ? "The job could not be saved. Try again."
                  : saveResult.error.message,
              });
              return;
            }

            reset(createFreshDefaults());
            setFeedback({
              kind: "info",
              message: saveResult.warnings.length
                ? `${saveResult.message} ${saveResult.warnings.join(" ")}`
                : saveResult.message,
            });
          } catch {
            setFeedback({
              kind: "error",
              message: "The job could not be saved. Try again.",
            });
          }
        },
        () => {
          setFeedback({
            kind: "error",
            message: "Fix the highlighted fields before saving.",
          });
        },
      )}
    >
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article className="space-y-6 rounded-2xl border border-border bg-panel p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Job details</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Manual fields stay under your control. Extracted fields remain
              editable before save.
            </p>
          </div>

          <div className="grid gap-5">
            <div>
              <label className="text-sm font-medium" htmlFor="jobUrl">
                Job URL
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
                id="jobUrl"
                placeholder="https://company.example/careers/job-posting"
                type="url"
                {...register("jobUrl")}
              />
              <FieldError message={errors.jobUrl?.message} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="source">
                  Source
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
                  defaultValue=""
                  id="source"
                  {...register("source")}
                >
                  <option value="">Select a source</option>
                  {JOB_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.source?.message} />
              </div>

              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="visaSponsorship"
                >
                  Visa Sponsorship
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
                  id="visaSponsorship"
                  placeholder="Optional note"
                  type="text"
                  {...register("visaSponsorship")}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="notes">
                Notes
              </label>
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
                id="notes"
                placeholder="Optional plain-text notes"
                {...register("notes")}
              />
            </div>
          </div>
        </article>

        <aside className="space-y-4 rounded-2xl border border-border bg-panel p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Action status</h2>
          <p className="text-sm leading-6 text-muted">
            Extract uses the deterministic extraction API with LLM fallback only
            when needed. Save writes the current form state to Excel through the
            backend API.
          </p>

          {feedback ? (
            <ExtractionWarning
              kind={feedback.kind}
              message={feedback.message}
            />
          ) : (
            <ExtractionWarning
              kind="info"
              message="Use Extract to fill editable job fields from the target page, then Save to persist the current form values."
            />
          )}

          <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm leading-6 text-muted">
            Save currently enforces:
            <ul className="mt-2 list-disc pl-5">
              <li>Job URL is required</li>
              <li>Source is required</li>
              <li>Date Applied is required</li>
              <li>Company or Role must be entered</li>
              <li>Duplicate Job URLs are blocked</li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Editable extracted fields</h2>
          <p className="text-sm leading-6 text-muted">
            These values stay editable so you can review and correct extracted
            details before saving.
          </p>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="company">
              Company
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
              id="company"
              placeholder="Company name"
              type="text"
              {...register("company")}
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="role">
              Role
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
              id="role"
              placeholder="Role title"
              type="text"
              {...register("role")}
            />
            <FieldError message={errors.role?.message} />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="jobId">
              Job ID
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
              id="jobId"
              placeholder="Optional job identifier"
              type="text"
              {...register("jobId")}
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="dateApplied">
              Date Applied
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
              id="dateApplied"
              type="date"
              {...register("dateApplied")}
            />
            <FieldError message={errors.dateApplied?.message} />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="createdAt">
              Created At
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
              id="createdAt"
              type="datetime-local"
              {...register("createdAt")}
            />
            <FieldError message={errors.createdAt?.message} />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="extractionStatus">
              Extraction Status
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
              id="extractionStatus"
              {...register("extractionStatus")}
            >
              <option value="manual_only">manual_only</option>
              <option value="partial">partial</option>
              <option value="complete">complete</option>
            </select>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-panel p-6 shadow-sm sm:flex-row sm:items-center">
        <button
          className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isExtracting || isSubmitting}
          onClick={handleExtractClick}
          type="button"
        >
          {isExtracting ? "Extracting..." : "Extract"}
        </button>
        <button
          className="rounded-full border border-border px-5 py-3 text-sm font-medium transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isExtracting || isSubmitting}
          type="submit"
        >
          Save
        </button>
        <button
          className="rounded-full border border-border px-5 py-3 text-sm font-medium transition hover:border-accent hover:text-accent"
          disabled={isExtracting || isSubmitting}
          onClick={handleResetClick}
          type="button"
        >
          Reset
        </button>
      </section>
    </form>
  );
}
