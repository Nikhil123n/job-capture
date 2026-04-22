import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Capture",
  description: "Local-first personal job application tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8 sm:px-8">
          <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-border bg-panel px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
                Job Capture
              </p>
              <h1 className="text-2xl font-semibold">Personal job tracker</h1>
            </div>
            <nav
              aria-label="Primary"
              className="flex gap-3 text-sm font-medium"
            >
              <Link
                className="rounded-full border border-border px-4 py-2 transition hover:border-accent hover:text-accent"
                href="/add-job"
              >
                Add Job
              </Link>
              <Link
                className="rounded-full border border-border px-4 py-2 transition hover:border-accent hover:text-accent"
                href="/jobs"
              >
                Jobs Applied
              </Link>
            </nav>
          </header>
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
