import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import JobsPage from "@/app/jobs/page";
import type { SavedJob } from "@/lib/types/job";

const fetchMock = vi.fn();

const initialJobs: SavedJob[] = [
  {
    company: "Example Corp",
    createdAt: "2026-04-22T12:34",
    dateApplied: "2026-04-22",
    extractionStatus: "complete",
    id: "2",
    jobId: "FE-123",
    jobUrl: "https://jobs.example.com/frontend-engineer",
    notes: "Saved from the Add Job form.",
    role: "Senior Frontend Engineer",
    source: "LinkedIn",
    visaSponsorship: "No",
  },
  {
    company: "Second Corp",
    createdAt: "2026-04-21T09:30",
    dateApplied: "2026-04-20",
    extractionStatus: "partial",
    id: "3",
    jobId: "PD-456",
    jobUrl: "https://jobs.example.com/product-designer",
    notes: "Found through a referral.",
    role: "Product Designer",
    source: "Other",
    visaSponsorship: "Unknown",
  },
];

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function filterAndSortJobs(
  jobs: SavedJob[],
  search: string,
  source: string,
  sort: string,
) {
  return [...jobs]
    .filter((job) => {
      if (source && job.source !== source) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        job.company,
        job.role,
        job.jobId,
        job.notes,
        job.jobUrl,
        job.source,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort((left, right) => {
      const leftDate = new Date(left.dateApplied).getTime();
      const rightDate = new Date(right.dateApplied).getTime();

      return sort === "date_asc" ? leftDate - rightDate : rightDate - leftDate;
    });
}

function installJobsFetchMock(jobs: SavedJob[] = initialJobs) {
  let currentJobs = jobs.map((job) => ({ ...job }));

  vi.stubGlobal(
    "fetch",
    fetchMock.mockImplementation(
      async (input: string | URL | Request, init?: RequestInit) => {
        const method =
          init?.method ?? (input instanceof Request ? input.method : "GET");
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const parsedUrl = new URL(url, "http://localhost");

        if (method === "PUT") {
          const id = parsedUrl.pathname.split("/").pop() ?? "";
          const requestBody = JSON.parse(
            typeof init?.body === "string"
              ? init.body
              : input instanceof Request
                ? await input.clone().text()
                : "{}",
          ) as Omit<SavedJob, "createdAt" | "id">;

          if (!/^https?:\/\//.test(requestBody.jobUrl)) {
            return {
              json: async () => ({
                error: {
                  code: "validation_error",
                  message:
                    "The update request did not match the required job schema.",
                },
                success: false,
                warnings: [],
              }),
              ok: false,
              status: 400,
            };
          }

          const duplicateJob = currentJobs.find(
            (job) => job.id !== id && job.jobUrl === requestBody.jobUrl,
          );

          if (duplicateJob) {
            return {
              json: async () => ({
                error: {
                  code: "duplicate_url",
                  message: "A job with the same URL already exists.",
                },
                success: false,
                warnings: [],
              }),
              ok: false,
              status: 409,
            };
          }

          currentJobs = currentJobs.map((job) =>
            job.id === id
              ? {
                  ...job,
                  ...requestBody,
                }
              : job,
          );

          const updatedJob = currentJobs.find((job) => job.id === id);

          return {
            json: async () => ({
              job: updatedJob,
              message: "Job updated in Excel.",
              success: true,
              warnings: [],
            }),
            ok: true,
            status: 200,
          };
        }

        const search =
          parsedUrl.searchParams.get("search")?.toLowerCase() ?? "";
        const source = parsedUrl.searchParams.get("source") ?? "";
        const sort = parsedUrl.searchParams.get("sort") ?? "date_desc";

        return {
          json: async () => ({
            jobs: filterAndSortJobs(currentJobs, search, source, sort),
          }),
          ok: true,
          status: 200,
        };
      },
    ),
  );
}

describe("JobsPage", () => {
  it("renders saved jobs from the API", async () => {
    installJobsFetchMock();
    render(<JobsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Jobs Applied" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading saved jobs...")).toBeInTheDocument();
    expect(await screen.findByText("Example Corp")).toBeInTheDocument();
    expect(screen.getByText("Second Corp")).toBeInTheDocument();
  });

  it("filters the table by search text", async () => {
    const user = userEvent.setup();
    installJobsFetchMock();
    render(<JobsPage />);

    await screen.findByText("Example Corp");
    await user.type(screen.getByLabelText("Search"), "designer");

    await waitFor(() => {
      expect(screen.queryByText("Example Corp")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Second Corp")).toBeInTheDocument();
  });

  it("filters the table by source", async () => {
    const user = userEvent.setup();
    installJobsFetchMock();
    render(<JobsPage />);

    await screen.findByText("Example Corp");
    await user.selectOptions(screen.getByLabelText("Source"), "Other");

    await waitFor(() => {
      expect(screen.queryByText("Example Corp")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Second Corp")).toBeInTheDocument();
  });

  it("sorts jobs by date applied", async () => {
    const user = userEvent.setup();
    installJobsFetchMock();
    render(<JobsPage />);

    await screen.findByText("Example Corp");
    await user.selectOptions(screen.getByLabelText("Date Applied"), "date_asc");

    await waitFor(() => {
      const roleLinks = screen.getAllByRole("link");
      expect(roleLinks[0]).toHaveTextContent("Product Designer");
      expect(roleLinks[1]).toHaveTextContent("Senior Frontend Engineer");
    });
  });

  it("keeps the role clickable outside edit mode", async () => {
    installJobsFetchMock();
    render(<JobsPage />);

    const roleLink = await screen.findByRole("link", {
      name: "Senior Frontend Engineer",
    });

    expect(roleLink).toHaveAttribute(
      "href",
      "https://jobs.example.com/frontend-engineer",
    );
  });

  it("enters row edit mode for a single job", async () => {
    const user = userEvent.setup();
    installJobsFetchMock();
    render(<JobsPage />);

    await screen.findByText("Example Corp");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    expect(await screen.findByText("Edit saved job")).toBeInTheDocument();
    expect(screen.getByLabelText("Edit Company")).toHaveValue("Example Corp");
    expect(screen.getByLabelText("Edit Role")).toHaveValue(
      "Senior Frontend Engineer",
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: "Edit" })[0]).toBeDisabled();
  });

  it("edits and saves a row while preserving non-edited rows", async () => {
    const user = userEvent.setup();
    installJobsFetchMock();
    render(<JobsPage />);

    await screen.findByText("Example Corp");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.clear(screen.getByLabelText("Edit Role"));
    await user.type(
      screen.getByLabelText("Edit Role"),
      "Staff Frontend Engineer",
    );
    await user.clear(screen.getByLabelText("Edit Notes"));
    await user.type(
      screen.getByLabelText("Edit Notes"),
      "Corrected after reviewing the saved row.",
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Job updated in Excel."),
    ).toBeInTheDocument();
    expect(screen.getByText("Staff Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Second Corp")).toBeInTheDocument();
    expect(screen.queryByText("Edit saved job")).not.toBeInTheDocument();
  });

  it("cancels row editing without changing the saved row", async () => {
    const user = userEvent.setup();
    installJobsFetchMock();
    render(<JobsPage />);

    await screen.findByText("Example Corp");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.clear(screen.getByLabelText("Edit Company"));
    await user.type(screen.getByLabelText("Edit Company"), "Changed Company");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Edit saved job")).not.toBeInTheDocument();
    expect(screen.getByText("Example Corp")).toBeInTheDocument();
    expect(screen.queryByText("Changed Company")).not.toBeInTheDocument();
  });

  it("renders the empty state when no jobs are returned", async () => {
    installJobsFetchMock([]);
    render(<JobsPage />);

    expect(await screen.findByText("No saved jobs yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Saved jobs will appear here after you add them from the Add Job page.",
      ),
    ).toBeInTheDocument();
  });

  it("renders an error state when jobs cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          error: {
            code: "unexpected_error",
            message: "Saved jobs could not be loaded.",
          },
          jobs: [],
          warnings: [],
        }),
        ok: false,
      }),
    );
    render(<JobsPage />);

    expect(await screen.findByText("Load failed")).toBeInTheDocument();
    expect(
      screen.getByText("Saved jobs could not be loaded."),
    ).toBeInTheDocument();
  });

  it("handles a malformed jobs list response safely", async () => {
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          unexpected: true,
        }),
        ok: true,
      }),
    );
    render(<JobsPage />);

    expect(await screen.findByText("Load failed")).toBeInTheDocument();
    expect(
      screen.getByText("Saved jobs could not be loaded."),
    ).toBeInTheDocument();
  });

  it("handles a malformed update response safely and keeps edit mode open", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      fetchMock
        .mockImplementationOnce(async () => ({
          json: async () => ({
            jobs: initialJobs,
          }),
          ok: true,
        }))
        .mockImplementationOnce(async () => ({
          json: async () => ({
            unexpected: true,
          }),
          ok: true,
        })),
    );

    render(<JobsPage />);

    await screen.findByText("Example Corp");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("The job could not be updated. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByText("Edit saved job")).toBeInTheDocument();
  });
});
