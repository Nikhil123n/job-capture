import { JOB_SOURCES } from "@/lib/config/sources";
import type { JobsSortOrder } from "@/lib/types/job";

type JobsFiltersProps = {
  onSearchChange: (value: string) => void;
  onSortChange: (value: JobsSortOrder) => void;
  onSourceChange: (value: string) => void;
  searchValue: string;
  sortValue: JobsSortOrder;
  sourceValue: string;
};

export function JobsFilters({
  onSearchChange,
  onSortChange,
  onSourceChange,
  searchValue,
  sortValue,
  sourceValue,
}: JobsFiltersProps) {
  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-panel p-6 shadow-sm md:grid-cols-[2fr_1fr_1fr]">
      <div>
        <label className="text-sm font-medium" htmlFor="jobs-search">
          Search
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
          id="jobs-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search company, role, job ID, notes, or URL"
          type="search"
          value={searchValue}
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="jobs-source-filter">
          Source
        </label>
        <select
          className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
          id="jobs-source-filter"
          onChange={(event) => onSourceChange(event.target.value)}
          value={sourceValue}
        >
          <option value="">All sources</option>
          {JOB_SOURCES.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="jobs-sort-order">
          Date Applied
        </label>
        <select
          className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
          id="jobs-sort-order"
          onChange={(event) =>
            onSortChange(event.target.value as JobsSortOrder)
          }
          value={sortValue}
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
        </select>
      </div>
    </section>
  );
}
