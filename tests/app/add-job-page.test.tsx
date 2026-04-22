import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AddJobPage from "@/app/add-job/page";

describe("AddJobPage", () => {
  it("renders the page header and form sections", () => {
    render(<AddJobPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Add Job" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Job details" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Editable extracted fields",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Extract" })).toBeInTheDocument();
  });
});
