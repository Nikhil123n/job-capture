type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <section className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Job Capture v1
      </p>
      <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        {description}
      </p>
    </section>
  );
}
