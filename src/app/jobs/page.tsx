import { JobsTable } from "@/components/jobs/jobs-table";
import { PageHeader } from "@/components/shared/page-header";

export default function JobsPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="Jobs Applied"
        description="Browse saved jobs from the Excel workbook, search and filter them, and keep the newest applications first by default."
      />

      <JobsTable />
    </main>
  );
}
