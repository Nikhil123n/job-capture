"use client";

import { Fragment, useEffect, useState } from "react";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { JOB_SOURCES } from "@/lib/config/sources";
import { EmptyState } from "@/components/shared/empty-state";
import type {
  JobsSortOrder,
  SavedJob,
  UpdateJobRequest,
} from "@/lib/types/job";
import {
  jobsListErrorResponseSchema,
  jobsListResponseSchema,
  updateJobResponseSchema,
} from "@/lib/validation/job";

import { JobsFilters } from "./jobs-filters";

const columnHelper = createColumnHelper<SavedJob>();

type FeedbackState = {
  kind: "error" | "info";
  message: string;
} | null;

type LoadState = "error" | "idle" | "loading";

function buildJobsUrl(search: string, source: string, sort: JobsSortOrder) {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (source) {
    params.set("source", source);
  }

  params.set("sort", sort);

  return `/api/jobs?${params.toString()}`;
}

function createEditableValues(job: SavedJob): UpdateJobRequest {
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
  };
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState }) {
  if (!feedback) {
    return null;
  }

  const className =
    feedback.kind === "error"
      ? "rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700"
      : "rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700";

  return <section className={className}>{feedback.message}</section>;
}

export function JobsTable() {
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState<JobsSortOrder>("date_desc");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<UpdateJobRequest | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    let isActive = true;

    async function loadJobs() {
      setLoadState("loading");
      setMessage("");

      try {
        const response = await fetch(buildJobsUrl(search, source, sort));
        let responseBody: unknown;

        try {
          responseBody = await response.json();
        } catch {
          throw new Error("Saved jobs could not be loaded.");
        }

        if (!response.ok) {
          const parsedError =
            jobsListErrorResponseSchema.safeParse(responseBody);

          throw new Error(
            parsedError.success
              ? parsedError.data.error.message
              : "Saved jobs could not be loaded.",
          );
        }

        const parsedJobsList = jobsListResponseSchema.safeParse(responseBody);

        if (!parsedJobsList.success) {
          throw new Error("Saved jobs could not be loaded.");
        }

        if (!isActive) {
          return;
        }

        setJobs(parsedJobsList.data.jobs);
        setLoadState("idle");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setJobs([]);
        setLoadState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Saved jobs could not be loaded.",
        );
      }
    }

    void loadJobs();

    return () => {
      isActive = false;
    };
  }, [refreshKey, search, sort, source]);

  function clearEditState() {
    setEditingJobId(null);
    setEditValues(null);
    setIsSavingEdit(false);
  }

  function handleSearchChange(value: string) {
    clearEditState();
    setSearch(value);
  }

  function handleSourceChange(value: string) {
    clearEditState();
    setSource(value);
  }

  function handleSortChange(value: JobsSortOrder) {
    clearEditState();
    setSort(value);
  }

  function handleEditStart(job: SavedJob) {
    setEditingJobId(job.id);
    setEditValues(createEditableValues(job));
    setFeedback(null);
  }

  function handleEditCancel() {
    clearEditState();
    setFeedback(null);
  }

  function updateEditValue<Field extends keyof UpdateJobRequest>(
    field: Field,
    value: UpdateJobRequest[Field],
  ) {
    setEditValues((currentValues) =>
      currentValues
        ? {
            ...currentValues,
            [field]: value,
          }
        : currentValues,
    );
  }

  async function handleEditSave() {
    if (!editingJobId || !editValues) {
      return;
    }

    setIsSavingEdit(true);

    try {
      const response = await fetch(`/api/jobs/${editingJobId}`, {
        body: JSON.stringify(editValues),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
      });
      let responseBody: unknown;

      try {
        responseBody = await response.json();
      } catch {
        setFeedback({
          kind: "error",
          message: "The job could not be updated. Try again.",
        });
        return;
      }

      const parsedUpdateResult =
        updateJobResponseSchema.safeParse(responseBody);

      if (!parsedUpdateResult.success) {
        setFeedback({
          kind: "error",
          message: "The job could not be updated. Try again.",
        });
        return;
      }

      const updateResult = parsedUpdateResult.data;

      if (!response.ok || !updateResult.success) {
        setFeedback({
          kind: "error",
          message: updateResult.success
            ? "The job could not be updated. Try again."
            : updateResult.error.message,
        });
        return;
      }

      clearEditState();
      setFeedback({
        kind: "info",
        message: updateResult.warnings.length
          ? `${updateResult.message} ${updateResult.warnings.join(" ")}`
          : updateResult.message,
      });
      setRefreshKey((currentKey) => currentKey + 1);
    } catch {
      setFeedback({
        kind: "error",
        message: "The job could not be updated. Try again.",
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  const columns = [
    columnHelper.accessor("company", {
      cell: (info) => info.getValue() || "-",
      header: "Company",
    }),
    columnHelper.accessor("role", {
      cell: (info) => {
        const job = info.row.original;
        const role = info.getValue() || "Untitled role";

        return job.jobUrl ? (
          <a
            className="font-medium text-accent underline-offset-4 hover:underline"
            href={job.jobUrl}
            rel="noreferrer"
            target="_blank"
          >
            {role}
          </a>
        ) : (
          role
        );
      },
      header: "Role",
    }),
    columnHelper.accessor("jobId", {
      cell: (info) => info.getValue() || "-",
      header: "Job ID",
    }),
    columnHelper.accessor("dateApplied", {
      header: "Date Applied",
    }),
    columnHelper.accessor("visaSponsorship", {
      cell: (info) => info.getValue() || "-",
      header: "Visa Sponsorship",
    }),
    columnHelper.accessor("source", {
      header: "Source",
    }),
    columnHelper.accessor("notes", {
      cell: (info) => info.getValue() || "-",
      header: "Notes",
    }),
    columnHelper.accessor("jobUrl", {
      cell: (info) => info.getValue() || "-",
      header: "Job URL",
    }),
    columnHelper.accessor("extractionStatus", {
      header: "Extraction Status",
    }),
    columnHelper.accessor("createdAt", {
      header: "Created At",
    }),
    columnHelper.display({
      cell: (info) => {
        const rowJob = info.row.original;
        const isEditingRow = editingJobId === rowJob.id;

        return (
          <button
            className="rounded-full border border-border px-4 py-2 text-xs font-medium transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={Boolean(editingJobId && !isEditingRow)}
            onClick={() => handleEditStart(rowJob)}
            type="button"
          >
            {isEditingRow ? "Editing" : "Edit"}
          </button>
        );
      },
      header: "Actions",
      id: "actions",
    }),
  ];

  // TanStack Table is the locked table stack for this page.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data: jobs,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="space-y-6">
      <JobsFilters
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
        onSourceChange={handleSourceChange}
        searchValue={search}
        sortValue={sort}
        sourceValue={source}
      />

      <FeedbackBanner feedback={feedback} />

      {loadState === "loading" ? (
        <section className="rounded-2xl border border-border bg-panel px-6 py-10 text-center shadow-sm">
          <p className="text-sm text-muted">Loading saved jobs...</p>
        </section>
      ) : null}

      {loadState === "error" ? (
        <section className="rounded-2xl border border-rose-300 bg-rose-50 px-6 py-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-rose-800">Load failed</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-rose-700">
            {message}
          </p>
        </section>
      ) : null}

      {loadState === "idle" && jobs.length === 0 ? (
        <EmptyState
          description="Saved jobs will appear here after you add them from the Add Job page."
          title="No saved jobs yet"
        />
      ) : null}

      {loadState === "idle" && jobs.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[#f2efe6] text-left">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        className="border-b border-border px-4 py-3 font-semibold"
                        key={header.id}
                        scope="col"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  const rowJob = row.original;
                  const isEditingRow = editingJobId === rowJob.id;

                  return (
                    <Fragment key={row.id}>
                      <tr className="border-b border-border align-top">
                        {row.getVisibleCells().map((cell) => (
                          <td className="px-4 py-3 text-muted" key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>

                      {isEditingRow && editValues ? (
                        <tr
                          className="border-b border-border bg-[#faf7ef] align-top last:border-b-0"
                          key={`${row.id}-edit`}
                        >
                          <td
                            className="px-4 py-4"
                            colSpan={table.getVisibleLeafColumns().length}
                          >
                            <section className="space-y-4">
                              <div className="flex flex-col gap-2">
                                <h3 className="text-base font-semibold text-foreground">
                                  Edit saved job
                                </h3>
                                <p className="text-sm text-muted">
                                  Update this row and save the current values
                                  back to Excel. Created At stays read-only.
                                </p>
                              </div>

                              <div className="grid gap-4 lg:grid-cols-2">
                                <div>
                                  <label
                                    className="text-sm font-medium text-foreground"
                                    htmlFor={`edit-company-${rowJob.id}`}
                                  >
                                    Edit Company
                                  </label>
                                  <input
                                    className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-accent"
                                    id={`edit-company-${rowJob.id}`}
                                    onChange={(event) =>
                                      updateEditValue(
                                        "company",
                                        event.target.value,
                                      )
                                    }
                                    type="text"
                                    value={editValues.company}
                                  />
                                </div>

                                <div>
                                  <label
                                    className="text-sm font-medium text-foreground"
                                    htmlFor={`edit-role-${rowJob.id}`}
                                  >
                                    Edit Role
                                  </label>
                                  <input
                                    className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-accent"
                                    id={`edit-role-${rowJob.id}`}
                                    onChange={(event) =>
                                      updateEditValue(
                                        "role",
                                        event.target.value,
                                      )
                                    }
                                    type="text"
                                    value={editValues.role}
                                  />
                                </div>

                                <div>
                                  <label
                                    className="text-sm font-medium text-foreground"
                                    htmlFor={`edit-job-id-${rowJob.id}`}
                                  >
                                    Edit Job ID
                                  </label>
                                  <input
                                    className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-accent"
                                    id={`edit-job-id-${rowJob.id}`}
                                    onChange={(event) =>
                                      updateEditValue(
                                        "jobId",
                                        event.target.value,
                                      )
                                    }
                                    type="text"
                                    value={editValues.jobId}
                                  />
                                </div>

                                <div>
                                  <label
                                    className="text-sm font-medium text-foreground"
                                    htmlFor={`edit-date-applied-${rowJob.id}`}
                                  >
                                    Edit Date Applied
                                  </label>
                                  <input
                                    className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-accent"
                                    id={`edit-date-applied-${rowJob.id}`}
                                    onChange={(event) =>
                                      updateEditValue(
                                        "dateApplied",
                                        event.target.value,
                                      )
                                    }
                                    type="date"
                                    value={editValues.dateApplied}
                                  />
                                </div>

                                <div>
                                  <label
                                    className="text-sm font-medium text-foreground"
                                    htmlFor={`edit-visa-sponsorship-${rowJob.id}`}
                                  >
                                    Edit Visa Sponsorship
                                  </label>
                                  <input
                                    className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-accent"
                                    id={`edit-visa-sponsorship-${rowJob.id}`}
                                    onChange={(event) =>
                                      updateEditValue(
                                        "visaSponsorship",
                                        event.target.value,
                                      )
                                    }
                                    type="text"
                                    value={editValues.visaSponsorship}
                                  />
                                </div>

                                <div>
                                  <label
                                    className="text-sm font-medium text-foreground"
                                    htmlFor={`edit-source-${rowJob.id}`}
                                  >
                                    Edit Source
                                  </label>
                                  <select
                                    className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-accent"
                                    id={`edit-source-${rowJob.id}`}
                                    onChange={(event) =>
                                      updateEditValue(
                                        "source",
                                        event.target
                                          .value as UpdateJobRequest["source"],
                                      )
                                    }
                                    value={editValues.source}
                                  >
                                    {JOB_SOURCES.map((jobSource) => (
                                      <option key={jobSource} value={jobSource}>
                                        {jobSource}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="lg:col-span-2">
                                  <label
                                    className="text-sm font-medium text-foreground"
                                    htmlFor={`edit-notes-${rowJob.id}`}
                                  >
                                    Edit Notes
                                  </label>
                                  <textarea
                                    className="mt-2 min-h-28 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-accent"
                                    id={`edit-notes-${rowJob.id}`}
                                    onChange={(event) =>
                                      updateEditValue(
                                        "notes",
                                        event.target.value,
                                      )
                                    }
                                    value={editValues.notes}
                                  />
                                </div>

                                <div className="lg:col-span-2">
                                  <label
                                    className="text-sm font-medium text-foreground"
                                    htmlFor={`edit-job-url-${rowJob.id}`}
                                  >
                                    Edit Job URL
                                  </label>
                                  <input
                                    className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-accent"
                                    id={`edit-job-url-${rowJob.id}`}
                                    onChange={(event) =>
                                      updateEditValue(
                                        "jobUrl",
                                        event.target.value,
                                      )
                                    }
                                    type="url"
                                    value={editValues.jobUrl}
                                  />
                                </div>

                                <div>
                                  <label
                                    className="text-sm font-medium text-foreground"
                                    htmlFor={`edit-extraction-status-${rowJob.id}`}
                                  >
                                    Edit Extraction Status
                                  </label>
                                  <select
                                    className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-accent"
                                    id={`edit-extraction-status-${rowJob.id}`}
                                    onChange={(event) =>
                                      updateEditValue(
                                        "extractionStatus",
                                        event.target
                                          .value as UpdateJobRequest["extractionStatus"],
                                      )
                                    }
                                    value={editValues.extractionStatus}
                                  >
                                    <option value="manual_only">
                                      manual_only
                                    </option>
                                    <option value="partial">partial</option>
                                    <option value="complete">complete</option>
                                  </select>
                                </div>

                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    Created At
                                  </p>
                                  <p className="mt-2 rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted shadow-sm">
                                    {rowJob.createdAt}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                  className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={isSavingEdit}
                                  onClick={handleEditSave}
                                  type="button"
                                >
                                  {isSavingEdit ? "Saving..." : "Save changes"}
                                </button>
                                <button
                                  className="rounded-full border border-border px-5 py-3 text-sm font-medium transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={isSavingEdit}
                                  onClick={handleEditCancel}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              </div>
                            </section>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
