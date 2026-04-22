import { AddJobForm } from "@/components/add-job/add-job-form";
import { PageHeader } from "@/components/shared/page-header";

export default function AddJobPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="Add Job"
        description="Paste a job URL, choose the source, review editable extracted fields, and save the job to the Excel workbook."
      />

      <AddJobForm />
    </main>
  );
}
