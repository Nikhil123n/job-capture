import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddJobForm } from "@/components/add-job/add-job-form";

const fetchMock = vi.fn();

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function createDeferredResponse() {
  let resolveResponse:
    | ((value: { json: () => Promise<unknown>; ok: boolean }) => void)
    | null = null;
  const responsePromise = new Promise<{
    json: () => Promise<unknown>;
    ok: boolean;
  }>((resolve) => {
    resolveResponse = resolve;
  });

  return {
    resolveResponse,
    responsePromise,
  };
}

describe("AddJobForm", () => {
  it("renders the locked form fields with sensible defaults", () => {
    render(<AddJobForm />);

    expect(screen.getByLabelText("Job URL")).toHaveValue("");
    expect(screen.getByLabelText("Source")).toHaveValue("");
    expect(screen.getByLabelText("Notes")).toHaveValue("");
    expect(screen.getByLabelText("Date Applied")).not.toHaveValue("");
    expect(screen.getByLabelText("Created At")).not.toHaveValue("");
    expect(
      (screen.getByLabelText("Date Applied") as HTMLInputElement).value,
    ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      (screen.getByLabelText("Created At") as HTMLInputElement).value,
    ).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(screen.getByLabelText("Extraction Status")).toHaveValue(
      "manual_only",
    );
  });

  it("shows validation feedback for the required save fields", async () => {
    const user = userEvent.setup();
    render(<AddJobForm />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Job URL is required.")).toBeInTheDocument();
    expect(screen.getByText("Source is required.")).toBeInTheDocument();
    expect(
      screen.getByText("Enter a Company or Role before saving."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Fix the highlighted fields before saving."),
    ).toBeInTheDocument();
  });

  it("supports the locked source dropdown values", async () => {
    const user = userEvent.setup();
    render(<AddJobForm />);

    await user.selectOptions(screen.getByLabelText("Source"), "Glassdoor");

    expect(screen.getByLabelText("Source")).toHaveValue("Glassdoor");
    expect(screen.getByRole("option", { name: "Other" })).toBeInTheDocument();
  });

  it("keeps notes as a multiline editable field", async () => {
    const user = userEvent.setup();
    render(<AddJobForm />);

    await user.type(
      screen.getByLabelText("Notes"),
      "Applied after a recruiter message.{enter}Need to follow up next week.",
    );

    expect(screen.getByLabelText("Notes")).toHaveValue(
      "Applied after a recruiter message.\nNeed to follow up next week.",
    );
  });

  it("keeps extracted fields visible and editable", async () => {
    const user = userEvent.setup();
    render(<AddJobForm />);

    await user.type(screen.getByLabelText("Company"), "Example Corp");
    await user.type(screen.getByLabelText("Role"), "Senior Frontend Engineer");
    await user.type(screen.getByLabelText("Job ID"), "FE-123");
    await user.clear(screen.getByLabelText("Date Applied"));
    await user.type(screen.getByLabelText("Date Applied"), "2026-04-20");
    await user.selectOptions(
      screen.getByLabelText("Extraction Status"),
      "partial",
    );

    expect(screen.getByLabelText("Company")).toHaveValue("Example Corp");
    expect(screen.getByLabelText("Role")).toHaveValue(
      "Senior Frontend Engineer",
    );
    expect(screen.getByLabelText("Job ID")).toHaveValue("FE-123");
    expect(screen.getByLabelText("Date Applied")).toHaveValue("2026-04-20");
    expect(screen.getByLabelText("Extraction Status")).toHaveValue("partial");
  });

  it("calls the extraction API and fills extracted fields", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          company: "Example Corp",
          extractionStatus: "complete",
          jobId: "FE-123",
          jobUrl: "https://jobs.example.com/frontend-role",
          normalizedJobUrl: "https://jobs.example.com/frontend-role",
          outcome: "success",
          role: "Senior Frontend Engineer",
          warnings: [],
        }),
        ok: true,
      }),
    );
    render(<AddJobForm />);

    await user.type(
      screen.getByLabelText("Job URL"),
      "https://jobs.example.com/frontend-role",
    );
    await user.selectOptions(screen.getByLabelText("Source"), "LinkedIn");
    await user.click(screen.getByRole("button", { name: "Extract" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/extract-job", {
      body: JSON.stringify({
        jobUrl: "https://jobs.example.com/frontend-role",
        source: "LinkedIn",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(
      await screen.findByText("Extraction applied to the editable fields."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Company")).toHaveValue("Example Corp");
    expect(screen.getByLabelText("Role")).toHaveValue(
      "Senior Frontend Engineer",
    );
    expect(screen.getByLabelText("Job ID")).toHaveValue("FE-123");
    expect(screen.getByLabelText("Extraction Status")).toHaveValue("complete");
  });

  it("renders warnings for blocked extraction results", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          company: "",
          extractionStatus: "manual_only",
          jobId: "",
          jobUrl: "https://jobs.example.com/frontend-role",
          normalizedJobUrl: "https://jobs.example.com/frontend-role",
          outcome: "blocked",
          role: "",
          warnings: [
            "The job page appears to block automated access. Review and complete the fields manually.",
          ],
        }),
        ok: true,
      }),
    );
    render(<AddJobForm />);

    await user.type(
      screen.getByLabelText("Job URL"),
      "https://jobs.example.com/frontend-role",
    );
    await user.selectOptions(screen.getByLabelText("Source"), "LinkedIn");
    await user.click(screen.getByRole("button", { name: "Extract" }));

    expect(
      await screen.findByText(
        "The job page appears to block automated access. Review and complete the fields manually.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Extraction Status")).toHaveValue(
      "manual_only",
    );
  });

  it("ignores a stale extraction result after the target URL changes", async () => {
    const user = userEvent.setup();
    const deferred = createDeferredResponse();

    vi.stubGlobal(
      "fetch",
      fetchMock.mockReturnValueOnce(deferred.responsePromise),
    );
    render(<AddJobForm />);

    await user.type(
      screen.getByLabelText("Job URL"),
      "https://jobs.example.com/frontend-role",
    );
    await user.selectOptions(screen.getByLabelText("Source"), "LinkedIn");
    await user.click(screen.getByRole("button", { name: "Extract" }));

    expect(
      screen.getByRole("button", { name: "Extracting..." }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();

    await user.clear(screen.getByLabelText("Job URL"));
    await user.type(
      screen.getByLabelText("Job URL"),
      "https://jobs.example.com/changed-role",
    );

    deferred.resolveResponse?.({
      json: async () => ({
        company: "Example Corp",
        extractionStatus: "complete",
        jobId: "FE-123",
        jobUrl: "https://jobs.example.com/frontend-role",
        normalizedJobUrl: "https://jobs.example.com/frontend-role",
        outcome: "success",
        role: "Senior Frontend Engineer",
        warnings: [],
      }),
      ok: true,
    });

    expect(
      await screen.findByText(
        "Extraction finished for an older form state and was ignored.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Job URL")).toHaveValue(
      "https://jobs.example.com/changed-role",
    );
    expect(screen.getByLabelText("Company")).toHaveValue("");
  });

  it("handles a malformed extraction response safely", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          unexpected: true,
        }),
        ok: true,
      }),
    );
    render(<AddJobForm />);

    await user.type(
      screen.getByLabelText("Job URL"),
      "https://jobs.example.com/frontend-role",
    );
    await user.selectOptions(screen.getByLabelText("Source"), "LinkedIn");
    await user.click(screen.getByRole("button", { name: "Extract" }));

    expect(
      await screen.findByText(
        "Extraction returned an unreadable response. Review and complete the fields manually.",
      ),
    ).toBeInTheDocument();
  });

  it("preserves user-entered extracted fields when extraction returns data", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          company: "Example Corp",
          extractionStatus: "complete",
          jobId: "FE-123",
          jobUrl: "https://jobs.example.com/frontend-role",
          normalizedJobUrl: "https://jobs.example.com/frontend-role",
          outcome: "success",
          role: "Senior Frontend Engineer",
          warnings: [],
        }),
        ok: true,
      }),
    );
    render(<AddJobForm />);

    await user.type(
      screen.getByLabelText("Job URL"),
      "https://jobs.example.com/frontend-role?utm_source=test",
    );
    await user.selectOptions(screen.getByLabelText("Source"), "LinkedIn");
    await user.type(screen.getByLabelText("Company"), "Hand Typed Corp");
    await user.click(screen.getByRole("button", { name: "Extract" }));

    expect(screen.getByLabelText("Company")).toHaveValue("Hand Typed Corp");
    expect(screen.getByLabelText("Role")).toHaveValue(
      "Senior Frontend Engineer",
    );
    expect(screen.getByLabelText("Job ID")).toHaveValue("FE-123");
    expect(screen.getByLabelText("Job URL")).toHaveValue(
      "https://jobs.example.com/frontend-role",
    );
  });

  it("keeps extracted fields editable after extraction", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          company: "Example Corp",
          extractionStatus: "complete",
          jobId: "FE-123",
          jobUrl: "https://jobs.example.com/frontend-role",
          normalizedJobUrl: "https://jobs.example.com/frontend-role",
          outcome: "success",
          role: "Senior Frontend Engineer",
          warnings: [],
        }),
        ok: true,
      }),
    );
    render(<AddJobForm />);

    await user.type(
      screen.getByLabelText("Job URL"),
      "https://jobs.example.com/frontend-role",
    );
    await user.selectOptions(screen.getByLabelText("Source"), "LinkedIn");
    await user.click(screen.getByRole("button", { name: "Extract" }));
    await user.clear(screen.getByLabelText("Role"));
    await user.type(screen.getByLabelText("Role"), "Staff Frontend Engineer");

    expect(screen.getByLabelText("Role")).toHaveValue(
      "Staff Frontend Engineer",
    );
  });

  it("saves successfully and resets the form to fresh defaults", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          job: {
            company: "Example Corp",
            createdAt: "2026-04-22T12:34",
            dateApplied: "2026-04-22",
            extractionStatus: "complete",
            id: "2",
            jobId: "FE-123",
            jobUrl: "https://jobs.example.com/frontend-role",
            notes: "Saved from the form.",
            role: "Senior Frontend Engineer",
            source: "LinkedIn",
            visaSponsorship: "No",
          },
          message: "Job saved to Excel.",
          success: true,
          warnings: [],
        }),
        ok: true,
      }),
    );
    render(<AddJobForm />);

    await user.type(
      screen.getByLabelText("Job URL"),
      "https://jobs.example.com/frontend-role",
    );
    await user.selectOptions(screen.getByLabelText("Source"), "LinkedIn");
    await user.type(screen.getByLabelText("Company"), "Example Corp");
    await user.type(screen.getByLabelText("Role"), "Senior Frontend Engineer");
    const createdAtBeforeSave = (
      screen.getByLabelText("Created At") as HTMLInputElement
    ).value;
    const dateAppliedBeforeSave = (
      screen.getByLabelText("Date Applied") as HTMLInputElement
    ).value;
    await user.click(screen.getByRole("button", { name: "Save" }));

    const [saveUrl, saveOptions] = fetchMock.mock.calls[0] ?? [];

    expect(saveUrl).toBe("/api/save-job");
    expect(saveOptions).toMatchObject({
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(JSON.parse((saveOptions as { body: string }).body)).toEqual({
      company: "Example Corp",
      createdAt: createdAtBeforeSave,
      dateApplied: dateAppliedBeforeSave,
      extractionStatus: "manual_only",
      jobId: "",
      jobUrl: "https://jobs.example.com/frontend-role",
      notes: "",
      role: "Senior Frontend Engineer",
      source: "LinkedIn",
      visaSponsorship: "",
    });
    expect(await screen.findByText("Job saved to Excel.")).toBeInTheDocument();
    expect(screen.getByLabelText("Job URL")).toHaveValue("");
    expect(screen.getByLabelText("Company")).toHaveValue("");
    expect(screen.getByLabelText("Role")).toHaveValue("");
    expect(screen.getByLabelText("Extraction Status")).toHaveValue(
      "manual_only",
    );
  });

  it("shows a duplicate-url error and keeps the current form values", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          error: {
            code: "duplicate_url",
            message: "A job with the same URL already exists.",
          },
          success: false,
          warnings: [],
        }),
        ok: false,
      }),
    );
    render(<AddJobForm />);

    await user.type(
      screen.getByLabelText("Job URL"),
      "https://jobs.example.com/frontend-role",
    );
    await user.selectOptions(screen.getByLabelText("Source"), "LinkedIn");
    await user.type(screen.getByLabelText("Company"), "Example Corp");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("A job with the same URL already exists."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Job URL")).toHaveValue(
      "https://jobs.example.com/frontend-role",
    );
    expect(screen.getByLabelText("Company")).toHaveValue("Example Corp");
  });

  it("shows a generic save error when the request fails unexpectedly", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", fetchMock.mockRejectedValueOnce(new Error("boom")));
    render(<AddJobForm />);

    await user.type(
      screen.getByLabelText("Job URL"),
      "https://jobs.example.com/frontend-role",
    );
    await user.selectOptions(screen.getByLabelText("Source"), "LinkedIn");
    await user.type(screen.getByLabelText("Company"), "Example Corp");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("The job could not be saved. Try again."),
    ).toBeInTheDocument();
  });

  it("handles a malformed save response safely", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          unexpected: true,
        }),
        ok: true,
      }),
    );
    render(<AddJobForm />);

    await user.type(
      screen.getByLabelText("Job URL"),
      "https://jobs.example.com/frontend-role",
    );
    await user.selectOptions(screen.getByLabelText("Source"), "LinkedIn");
    await user.type(screen.getByLabelText("Company"), "Example Corp");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("The job could not be saved. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Job URL")).toHaveValue(
      "https://jobs.example.com/frontend-role",
    );
  });
});
